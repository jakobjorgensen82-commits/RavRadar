import './about-i18n.js?v=4.0.299';

const homeLink=document.querySelector('.back-link');
homeLink?.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  const target=new URL(homeLink.href,location.href);
  target.searchParams.set('nonce',String(Date.now()));
  location.assign(target.href);
});

const mobilePayUrl='https://qr.mobilepay.dk/box/8f2b226a-fd43-43f2-8610-1fa0df857c63/pay-in';
const qrTarget=document.querySelector('#mobilepay-qr');

if(window.QRCode&&qrTarget){
  new window.QRCode(qrTarget,{
    text:mobilePayUrl,
    width:260,
    height:260,
    colorDark:'#2f1557',
    colorLight:'#ffffff',
    correctLevel:window.QRCode.CorrectLevel.M
  });
}
