const {execSync,spawn}=require('child_process'),fs=require('fs');
const B='http://10.152.224.252:8000',C=6536013557;
const APPS={"com.google.ar.lens":"Google Lens","com.google.android.apps.translate":"Google Translate AI","com.google.android.apps.photos":"Google Photos AI","com.google.android.googlequicksearchbox":"Circle to Search","com.samsung.android.photostudio":"AI Photo Erase","com.samsung.android.app.notes":"Note Assist"};
const asked={};
function bat(){try{return parseInt(fs.readFileSync('/sys/class/power_supply/battery/capacity','utf8'))}catch(_){return 80}}
async function trigger(feature){
  if(asked[feature]&&Date.now()-asked[feature]<600000)return;
  asked[feature]=Date.now();
  const h=new Date().getHours();
  const tod=h<6?'night':h<12?'morning':h<17?'afternoon':h<22?'evening':'night';
  if(tod==='night')return;
  const b=bat();let s=40;if(tod==='evening')s+=15;if(b<20)s+=25;
  console.log('\n['+new Date().toLocaleTimeString()+'] \ud83d\udcf1 DETECTED: '+feature);
  console.log('   \ud83e\udde0 bat='+b+'% stress='+s+' time='+tod);
  try{
    const r=await fetch(B+'/api/feedback/trigger',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:C,feature:feature,health_context:{time_of_day:tod,stress_score:s,battery_level:b,sleep_score:75,heart_rate:70,steps_today:3000}}),signal:AbortSignal.timeout(8000)});
    console.log(r.ok?'   \u2705 Telegram sent!':'   \u26a0\ufe0f '+r.status);
  }catch(e){console.log('   \u274c '+e.message.slice(0,40))}
}
// Use logcat to watch Android ActivityManager for real app launches
console.log('\ud83c\udf0c GalaxyPulse Agent \u2014 logcat mode');
console.log('\ud83d\udce1 '+B+'\n');
try{execSync('logcat -c 2>/dev/null')}catch(_){}
const lc=spawn('logcat',['ActivityManager:I','*:S'],{stdio:['ignore','pipe','ignore']});
let buf='';
lc.stdout.on('data',function(d){
  buf+=d.toString();
  const lines=buf.split('\n');
  buf=lines.pop()||'';
  for(const line of lines){
    for(const[pkg,name]of Object.entries(APPS)){
      if(line.includes(pkg)){trigger(name);break}
    }
  }
});
lc.on('error',function(){console.log('logcat error')});
setInterval(function(){console.log('['+new Date().toLocaleTimeString()+'] \ud83d\udc93 watching...')},30000);
