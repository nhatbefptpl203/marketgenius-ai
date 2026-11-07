'use strict';
// Controlled HTTP integration fixture. No real network/keys are used.
let geminiCalls=0;
const items=Array.from({length:5},(_,i)=>({title:'Chiến dịch '+i,channel:'Facebook',concept:'Video demo',timeline:Array.from({length:4},(_,w)=>({week:w+1,task:'Tuần '+(w+1)})),allocations:[{label:'Nội dung',percent:80},{label:'Dự phòng',percent:20}]}));
global.fetch=async(url,opts={})=>{
  if(String(url).includes('turnstile')) {
    const response=String(opts.body);
    return {ok:true,json:async()=>({success:!response.includes('invalid'),action:'guest_generate',hostname:'127.0.0.1'})};
  }
  geminiCalls++;
  if(geminiCalls===1)return {ok:false,status:500,text:async()=>JSON.stringify({error:{message:'temporary_failure'}})};
  return {ok:true,status:200,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({ideas:items})}]}}]})};
};
