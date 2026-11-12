import crypto from 'node:crypto';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error('LOCAL_RESTORE_FAILED_CLOSED'),{code:'ARCHIVE_SQL_'+code});};
const MAX_BYTES=2_000_000_000,MAX_LINE=64*1024,MAX_TABLES=256;
const mask256=(1n<<256n)-1n,mask512=(1n<<512n)-1n;
const identifier='(?:"(?:[^"\\r\\n\\0]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)';
const qualified=new RegExp('^('+identifier+')\\.('+identifier+')$');
const header=new RegExp('^COPY ('+identifier+')\\.('+identifier+') \\(('+identifier+'(?:, '+identifier+')*)\\) FROM stdin;$');
const sequence=/^SELECT pg_catalog\.setval\('((?:[^']|'')+)', (-?[0-9]+), (true|false)\);$/;
const decodeIdentifier=token=>{
  const value=token[0]==='"'?token.slice(1,-1).replaceAll('""','"'):token.toLowerCase();
  need(Buffer.byteLength(value)>0&&Buffer.byteLength(value)<=63,'COPY_IDENTIFIER');return value;
};
export const quoteCopyIdentifier=value=>'"'+value.replaceAll('"','""')+'"';
export const qualifiedCopyName=table=>quoteCopyIdentifier(table.schema)+'.'+quoteCopyIdentifier(table.table);
export const COPY_SESSION_SQL="SET client_encoding = 'UTF8'; SET standard_conforming_strings = on; SET DateStyle = 'ISO, YMD'; SET IntervalStyle = 'postgres'; SET extra_float_digits = 3; SET bytea_output = 'hex'; SET TimeZone = 'UTC'; SET xmloption = content; SET row_security = off;\n";
const dataPreamble=new Set(["SET session_replication_role = replica;","SET statement_timeout = 0;","SET lock_timeout = 0;",
  "SET idle_in_transaction_session_timeout = 0;","SET transaction_timeout = 0;","SET client_encoding = 'UTF8';",
  "SET standard_conforming_strings = on;","SET check_function_bodies = false;","SET xmloption = content;",
  "SET client_min_messages = warning;","SET row_security = off;","SELECT pg_catalog.set_config('search_path', '', false);","RESET ALL;"]);

// Two independently domain-separated sums and exact multiplicity retain
// duplicates while ignoring heap order. No raw row is retained or returned.
class Rows {
  constructor(table,salt,{terminator=false}={}){
    this.columns=table.columns.length;this.terminator=terminator;this.prefix=Buffer.concat([salt,Buffer.from(JSON.stringify([table.schema,table.table,table.columns]))]);
    this.rows=0;this.bytes=0;this.sum256=0n;this.sum512=0n;this.finished=false;this.reset();
  }
  reset(){this.length=0;this.first=[];this.fields=1;this.escaped=false;
    this.hash256=crypto.createHash('sha256').update(this.prefix).update(Buffer.from([1]));
    this.hash512=crypto.createHash('sha512').update(this.prefix).update(Buffer.from([2]));}
  write(bytes){need(!this.finished,'COPY_AFTER_END');this.length+=bytes.length;need(this.length<=MAX_BYTES,'COPY_ROW_BOUND');
    for(const byte of bytes){if(this.first.length<2)this.first.push(byte);need(byte!==0&&byte!==13,'COPY_ROW_ENCODING');
      if(this.escaped){this.escaped=false;continue;}if(byte===92)this.escaped=true;else if(byte===9)this.fields++;}
    this.hash256.update(bytes);this.hash512.update(bytes);
  }
  newline(){
    if(this.length===2&&this.first[0]===92&&this.first[1]===46){need(this.terminator,'COPY_UNEXPECTED_TERMINATOR');this.finished=true;return true;}
    need(!this.escaped&&this.fields===this.columns,'COPY_ROW_COLUMNS');
    this.rows++;this.bytes+=this.length+1;need(this.bytes<=MAX_BYTES,'COPY_DATA_BOUND');
    this.sum256=(this.sum256+BigInt('0x'+this.hash256.digest('hex')))&mask256;
    this.sum512=(this.sum512+BigInt('0x'+this.hash512.digest('hex')))&mask512;this.reset();return false;
  }
  summary(){need(this.length===0||this.finished,'COPY_ROW_INCOMPLETE');
    return {rows:this.rows,bytes:this.bytes,sum256:this.sum256,sum512:this.sum512};}
}
export function collectLocalCopy(table,salt,{expected=table.summary,maximumBytes=MAX_BYTES}={}){
  const rows=new Rows(table,salt);let count=0;
  return {write(bytes){count+=bytes.length;need(count<=maximumBytes,'COPY_TARGET_BOUND');
      let at=0;for(;;){const end=bytes.indexOf(10,at);if(end<0){rows.write(bytes.subarray(at));break;}
        rows.write(bytes.subarray(at,end));rows.newline();at=end+1;if(at===bytes.length)break;}},
    finish(){const actual=rows.summary();
      if(expected)need(actual.rows===expected.rows&&actual.sum256===expected.sum256&&actual.sum512===expected.sum512,
        'COPY_EXPORT_PARITY_MISMATCH');return actual;}};
}
export function localCopySql(table){
  return COPY_SESSION_SQL+'COPY '+qualifiedCopyName(table)+' ('+table.columns.map(quoteCopyIdentifier).join(', ')+') TO STDOUT;\n';
}
export class AuthenticatedCopyCatalog {
  constructor({salt=crypto.randomBytes(32)}={}){
    need(Buffer.isBuffer(salt)&&salt.length===32,'COPY_SALT');this.salt=Buffer.from(salt);this.tables=[];this.sequences=[];
    this.seen=new Set();this.files=new Set();this.totalBytes=0;this.file=null;this.line=Buffer.alloc(0);this.active=null;
  }
  beginFile(name){need(this.file===null&&['data.sql','history-data.sql'].includes(name)&&!this.files.has(name),'COPY_FILE');
    this.file=name;this.files.add(name);this.fileOffset=0;}
  outside(bytes){
    need(this.line.length+bytes.length<=MAX_LINE,'COPY_SQL_LINE_BOUND');this.line=Buffer.concat([this.line,bytes]);
  }
  endLine(){
    let line;try{line=new TextDecoder('utf-8',{fatal:true}).decode(this.line);}catch{need(false,'COPY_SQL_ENCODING');}this.line=Buffer.alloc(0);
    if(line===''||line.startsWith('--'))return;
    const copy=header.exec(line);
    if(copy){
      const columns=[...copy[3].matchAll(new RegExp(identifier,'g'))].map(match=>decodeIdentifier(match[0]));
      need(columns.length>0&&columns.length<=1600&&new Set(columns).size===columns.length,'COPY_COLUMNS');
      const table={schema:decodeIdentifier(copy[1]),table:decodeIdentifier(copy[2]),columns};
      const key=JSON.stringify([table.schema,table.table]);need(!this.seen.has(key)&&this.tables.length<MAX_TABLES,'COPY_DUPLICATE_OR_BOUND');
      this.seen.add(key);Object.assign(table,{file:this.file,dataStart:this.fileOffset});
      this.active={table,rows:new Rows(table,this.salt,{terminator:true}),wireHash:crypto.createHash('sha256')};return;
    }
    const setval=sequence.exec(line);
    if(setval){
      const name=qualified.exec(setval[1].replaceAll("''","'"));need(name&&this.sequences.length<MAX_TABLES,'COPY_SEQUENCE');
      const value=BigInt(setval[2]);need(value>=-(1n<<63n)&&value<(1n<<63n),'COPY_SEQUENCE_BOUND');
      const item={schema:decodeIdentifier(name[1]),table:decodeIdentifier(name[2]),value:value.toString(),called:setval[3]==='true'};
      need(!this.sequences.some(old=>old.schema===item.schema&&old.table===item.table),'COPY_DUPLICATE_SEQUENCE');this.sequences.push(item);return;
    }
    need(dataPreamble.has(line),'COPY_UNSUPPORTED_DATA_STATEMENT');
  }
  write(bytes){need(this.file!==null&&Buffer.isBuffer(bytes),'COPY_INPUT');this.totalBytes+=bytes.length;need(this.totalBytes<=MAX_BYTES,'COPY_TOTAL_BOUND');
    let at=0;for(;;){const end=bytes.indexOf(10,at),part=bytes.subarray(at,end<0?bytes.length:end);
      if(this.active){this.active.rows.write(part);this.active.wireHash.update(part);}else this.outside(part);
      this.fileOffset+=part.length;
      if(end<0)break;
      this.fileOffset++;
      if(this.active){this.active.wireHash.update(Buffer.from([10]));if(this.active.rows.newline()){
        const {table,rows,wireHash}=this.active;table.summary=rows.summary();table.dataEnd=this.fileOffset;
        table.copyWireSha256=wireHash.digest('hex');need(table.dataEnd-table.dataStart===table.summary.bytes+3,'COPY_RANGE');
        this.tables.push(table);this.active=null;}}
      else this.endLine();
      at=end+1;if(at===bytes.length)break;
    }
  }
  finishFile(){need(this.file!==null&&!this.active,'COPY_BLOCK_INCOMPLETE');if(this.line.length)this.endLine();
    need(!this.active,'COPY_FILE_INCOMPLETE');this.file=null;}
  finish(){need(this.file===null&&this.files.size===2&&this.tables.length>0,'COPY_CATALOG_INCOMPLETE');return this;}
}
