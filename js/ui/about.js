import './about-i18n.js?v=4.0.307';
import { installAboutHomeReturn } from '../core/about-home-return.js?v=4.0.307';

installAboutHomeReturn({
  link:document.querySelector('.back-link'),
  historyObject:history,
  locationObject:location,
  documentObject:document,
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
