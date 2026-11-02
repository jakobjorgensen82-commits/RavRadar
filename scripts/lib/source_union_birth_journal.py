"""Fixed H71 union creator journal. Transport is not SOURCE/stop authority."""
from __future__ import annotations
import errno
import fcntl
import hashlib
import json
import os
import stat
import sys
from contextlib import contextmanager
from pathlib import Path

_KEYS = ('st_dev','st_ino','st_mode','st_nlink','st_size','st_mtime_ns','st_ctime_ns')
_OUT_KEYS = ('dev','ino','mode','nlink','size','mtimeNs','ctimeNs')

def _identity(value):
    return {key: str(getattr(value, source)) for key, source in zip(_OUT_KEYS, _KEYS)}

def _same(left, right, full=True):
    return all(getattr(left,key)==getattr(right,key) for key in (_KEYS if full else _KEYS[:3]))

class SourceUnionBirthJournal:
    def __init__(self):
        if sys.platform != 'linux':
            raise RuntimeError('SOURCE_UNION_BIRTH_LINUX_REQUIRED')
        self.fd, self.root_fd = 3, 4
        self.root = Path(os.readlink('/proc/self/fd/4'))
        self.root_identity = os.fstat(4)
        named = os.stat('union-birth.jsonl',dir_fd=4,follow_symlinks=False)
        journal = os.fstat(3)
        flags = fcntl.fcntl(3,fcntl.F_GETFL)
        if (not stat.S_ISDIR(self.root_identity.st_mode) or self.root.name != 'source-union'
                or not stat.S_ISREG(journal.st_mode) or journal.st_nlink != 1
                or not _same(journal,named) or not flags & os.O_APPEND
                or flags & os.O_ACCMODE != os.O_RDWR):
            raise RuntimeError('SOURCE_UNION_BIRTH_INHERITANCE_INVALID')
        command = Path(f'/proc/{os.getppid()}/cmdline').read_bytes().split(b'\0')
        command = [item for item in command if item]
        if (len(command)!=3 or Path(os.fsdecode(command[1])).name!='source-progress-union-consumer.mjs'
                or command[2]!=b'--source-owned-progress-union'):
            raise RuntimeError('SOURCE_UNION_BIRTH_PARENT_INVALID')
        self.files, self.directories, self.first_failure = {}, {}, None
        self.append({'event':'child-start'})

    def relative(self, value):
        value = Path(value).absolute()
        try:
            name = value.relative_to(self.root).as_posix()
        except ValueError:
            raise RuntimeError('SOURCE_UNION_BIRTH_PATH_INVALID') from None
        if (name in ('','.','union-result.json','union-birth.jsonl') or len(name)>4096
                or '\\' in name or any(part in ('','.','..') for part in name.split('/'))):
            raise RuntimeError('SOURCE_UNION_BIRTH_PATH_INVALID')
        return name

    def append(self, value):
        if self.first_failure is not None:
            raise self.first_failure[0]
        try:
            body=(json.dumps({'schemaVersion':1,'actor':'python','pid':os.getpid(),**value},
                ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
            if len(body)>8192 or os.fstat(self.fd).st_size+len(body)>32*1024*1024:
                raise RuntimeError('SOURCE_UNION_BIRTH_LIMIT')
            if os.write(self.fd,body)!=len(body):
                raise RuntimeError('SOURCE_UNION_BIRTH_SHORT_WRITE')
        except BaseException as error:
            self.first_failure = self.first_failure or [error]
            raise self.first_failure[0]

    def mkdirs(self, destination):
        name=self.relative(destination)
        current=self.root
        for part in name.split('/'):
            current=current/part
            relative=current.relative_to(self.root).as_posix()
            if relative in self.directories:
                actual=current.lstat()
                if not stat.S_ISDIR(actual.st_mode) or not _same(actual,self.directories[relative],False):
                    raise RuntimeError('SOURCE_UNION_BIRTH_DIRECTORY_CHANGED')
                continue
            os.mkdir(current,0o700) # No exist_ok/adoption of an unknown directory.
            born=current.lstat()
            self.directories[relative]=born
            if not stat.S_ISDIR(born.st_mode) or stat.S_ISLNK(born.st_mode):
                raise RuntimeError('SOURCE_UNION_BIRTH_DIRECTORY_INVALID')
            self.append({'event':'directory-born','relative':relative,'identity':_identity(born)})

    def write_bytes(self, destination, body):
        name=self.relative(destination)
        if name in self.files or not isinstance(body,bytes):
            raise RuntimeError('SOURCE_UNION_BIRTH_FILE_REUSED')
        parent=Path(destination).parent
        if parent!=self.root:
            self.mkdirs(parent)
        fd=os.open(destination,os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW|os.O_CLOEXEC,0o600)
        row={'fd':fd,'birth':None,'closed':False}
        self.files[name]=row # Actual fd retained before another operation.
        failure=None
        try:
            born=os.fstat(fd); row['birth']=born
            if not stat.S_ISREG(born.st_mode) or born.st_nlink!=1 or born.st_size!=0:
                raise RuntimeError('SOURCE_UNION_BIRTH_FILE_INVALID')
            self.append({'event':'file-born','relative':name,'identity':_identity(born)})
            offset=0
            while offset<len(body):
                count=os.write(fd,body[offset:])
                if count<=0: raise RuntimeError('SOURCE_UNION_BIRTH_SHORT_WRITE')
                offset+=count
            os.fsync(fd)
            after=os.fstat(fd)
            if not _same(born,after,False) or after.st_nlink!=1 or after.st_size!=len(body):
                raise RuntimeError('SOURCE_UNION_BIRTH_FILE_CHANGED')
        except BaseException as error:
            failure=[error]
        try:
            os.close(fd)
        except BaseException as error:
            failure=failure or [error]
        try:
            os.fstat(fd)
        except OSError as error:
            row['closed']=error.errno==errno.EBADF
        except BaseException as error:
            failure=failure or [error]
        if not row['closed']:
            failure=failure or [RuntimeError('SOURCE_UNION_BIRTH_CLOSE_UNPROVED')]
        if failure is not None:
            self.first_failure=self.first_failure or failure
            raise self.first_failure[0]
        if not _same(after,Path(destination).lstat()):
            raise RuntimeError('SOURCE_UNION_BIRTH_FILE_CHANGED')
        self.append({'event':'file-closed','relative':name,'identity':_identity(after),
            'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()})

    @contextmanager
    def stage(self, output):
        self.mkdirs(output)
        yield str(output) # Retain on any failure; final P catalog alone cleans.

    def finish(self):
        if self.first_failure is not None: raise self.first_failure[0]
        if any(not row['closed'] for row in self.files.values()):
            raise RuntimeError('SOURCE_UNION_BIRTH_CLOSE_UNPROVED')
        self.append({'event':'child-complete'})
        os.fsync(self.fd) # Borrowed H descriptor; never close/release here.
