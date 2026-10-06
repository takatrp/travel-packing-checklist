export const PURPOSES = [{id:'meeting',label:'商談・訪問'},{id:'seminar',label:'研修・セミナー'},{id:'presentation',label:'登壇・発表'},{id:'remote',label:'オンライン会議'}] as const;
export const TRANSPORTS=[{id:'train',label:'新幹線・特急'},{id:'flight',label:'飛行機'},{id:'bus',label:'高速バス'},{id:'local',label:'電車・バス'},{id:'rental',label:'レンタカー'},{id:'car',label:'自家用車'}] as const;
export type City={id:number;name:string;admin?:string;country?:string;lat:number;lon:number;timezone:string};
export type Day = {work:boolean;travel:boolean;private:boolean;transports?:string[];city?:City|null};
export type Trip = { startDate?:string;city?:City|null; daily:Day[]; days:number; privateDays:number; purposes:string[]; departure:'business'|'private'; spare:boolean; pc:boolean|null; chargers:boolean };
export type CustomItem = {id:string;name:string;qty:number};
export type PackingState = {trip:Trip; overrides:Record<string,number>; packed:Record<string,number>; custom:CustomItem[]};
export type Item = {id:string; name:string; category:string; qty:number; unit:string; reason:string; auto:number; worn:number; custom?:boolean};
export const initialState = ():PackingState => ({trip:{startDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),city:null,daily:[{work:true,travel:false,private:false},{work:true,travel:false,private:false}],days:2,privateDays:0,purposes:['meeting'],departure:'business',spare:false,pc:null,chargers:false},overrides:{},packed:{},custom:[]});
export function validateState(value:unknown):PackingState {
 if (!value || typeof value!=='object') throw new Error('設定を確認してください');
 const s=value as PackingState, t=s.trip;
 const integer=(n:unknown,max=99)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=max;
 if (!t || !integer(t.days,30)||t.days<1||!integer(t.privateDays,30)||t.privateDays>t.days) throw new Error('全日数は1〜30日、私用の日数は全日数以下にしてください');
 if(!Array.isArray(t.daily)||t.daily.length!==t.days||t.daily.some(d=>!d||[d.work,d.travel,d.private].some(v=>typeof v!=='boolean')||!(d.work||d.travel||d.private)))throw new Error('各日の目的を1つ以上選んでください');
 if(t.startDate!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(t.startDate)||Number.isNaN(new Date(t.startDate+'T00:00:00Z').getTime())||new Date(t.startDate+'T00:00:00Z').toISOString().slice(0,10)!==t.startDate))throw new Error('出発日を確認してください');
 const cities=[t.city,...t.daily.map(d=>d.city)].filter(Boolean) as City[];if(cities.some(c=>typeof c.name!=='string'||c.name.length>100||typeof c.lat!=='number'||!Number.isFinite(c.lat)||Math.abs(c.lat)>90||typeof c.lon!=='number'||!Number.isFinite(c.lon)||Math.abs(c.lon)>180||typeof c.timezone!=='string'||c.timezone.length>80))throw new Error('行き先を選び直してください');
 if(t.daily.some(d=>d.transports&&(!Array.isArray(d.transports)||d.transports.some(x=>!TRANSPORTS.some(t=>t.id===x)))))throw new Error('移動手段を確認してください');
 if (!Array.isArray(t.purposes)||t.purposes.some(p=>!PURPOSES.some(x=>x.id===p))||!['business','private'].includes(t.departure)||typeof t.spare!=='boolean'||typeof t.chargers!=='boolean'||!(t.pc===null||typeof t.pc==='boolean')) throw new Error('出張の条件を確認してください');
 for(const map of [s.overrides,s.packed]) if(!map||typeof map!=='object'||Array.isArray(map)||Object.keys(map).length>150||Object.entries(map).some(([k,v])=>!/^[a-zA-Z0-9_-]{1,80}$/.test(k)||!integer(v))) throw new Error('数量は0〜99で入力してください');
 if(!Array.isArray(s.custom)||s.custom.length>50||s.custom.some(i=>!/^custom-[a-zA-Z0-9-]{1,70}$/.test(i.id)||typeof i.name!=='string'||!i.name.trim()||i.name.length>60||!integer(i.qty))) throw new Error('追加の持ち物を確認してください');
 if(new Set(s.custom.map(i=>i.id)).size!==s.custom.length) throw new Error('持ち物のIDが重複しています');
 return s;
}
// Reuse matching custom rows rather than losing their saved IDs, quantities or checks.
const workGear=[{id:'roba',name:'roBa'},{id:'napepro',name:'Napepro'},{id:'xreal-one-pro',name:'Xreal one pro'},{id:'pc-battery',name:'PCバッテリー'}] as const;
const gearKey=(name:string)=>name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const isWorkGear=(name:string)=>workGear.some(gear=>gearKey(gear.name)===gearKey(name));
export function makeItems(s:PackingState):Item[]{
 const t=s.trip,b=t.daily.filter(d=>d.work).length,casualDays=t.daily.filter(d=>d.private||!d.work).length,n=t.days-1,bus=b>0,pri=casualDays>0;
 const first=t.daily[0],wearBus=first.work&&(!first.private||t.departure==='business'),wearPri=!wearBus;
 const pc=t.pc??bus, spare=t.spare?1:0;
 const items:Item[]=[];
 const add=(id:string,name:string,category:string,qty:number,unit='点',reason='',worn=0)=>items.push({id,name,category,qty:s.overrides[id]??qty,auto:qty,unit,reason,worn});
 const daily=Math.max(0,t.days-1)+spare;
 add('underwear','パンツ（下着）','衣類',daily,'枚','1日1枚・着用分を除く',1);
 add('socks','靴下','衣類',daily,'足','1日1足・着用分を除く',1);
 add('undershirt','肌着・インナー','衣類',daily,'枚','1日1枚・着用分を除く',1);
 add('business-shirt','仕事用シャツ・トップス','衣類',Math.max(0,b-(wearBus?1:0)),'枚','仕事の日数分',wearBus?1:0);
 add('business-outfit','仕事用の上下・ジャケット','衣類',bus&&!wearBus?1:0,'組','同じ服を着回す想定',wearBus?1:0);
 add('casual-top','私服のトップス','衣類',Math.max(0,casualDays-(wearPri?1:0)),'枚','私用・移動のみの日に合わせる',wearPri?1:0);
 add('casual-bottom','私服のボトムス','衣類',pri&&!wearPri?1:0,'着','同じ服を着回す想定',wearPri?1:0);
 add('casual-shoes','私用の靴','衣類',pri&&!wearPri?1:0,'足','必要に応じて調整',wearPri?1:0);
 add('business-shoes','仕事用の靴','衣類',bus&&!wearBus?1:0,'足','必要に応じて調整',wearBus?1:0);
 add('nightwear','部屋着・寝間着','衣類',n>0?1:0,'組','宿泊する場合');
 add('pc','PC','仕事・電源',pc?1:0,'台');
 add('pc-power','PC用電源アダプター','仕事・電源',pc?1:0,'個');
 for(const gear of workGear) if(!s.custom.some(c=>gearKey(c.name)===gearKey(gear.name))) add(gear.id,gear.name,'仕事・電源',gear.id==='pc-battery'?(pc?1:0):1,'点');
 add('pc-cable','PC用充電ケーブル','仕事・電源',pc?1:0,'本','電源一体型なら不要');
 add('headset','ヘッドセット','仕事・電源',bus?1:0,'個','会議・作業用');
 add('presentation','映像出力アダプター','仕事・電源',bus&&t.purposes.includes('presentation')?1:0,'個','登壇・発表用');
 add('cards','名刺・必要な資料','仕事・電源',bus&&t.purposes.includes('meeting')?1:0,'組','商談・訪問用');
 add('notebook','ノート・筆記具','仕事・電源',bus&&t.purposes.includes('seminar')?1:0,'組','研修・セミナー用');
 add('phone-charger','スマホ用充電器・ケーブル','仕事・電源',1,'組');
 add('shaver','シェーバー','アメニティ',n>0?1:0,'個');
 add('toothbrush','電動歯ブラシ','アメニティ',n>0?1:0,'本');
 add('toothpaste','歯磨き粉','アメニティ',n>0?1:0,'本');
 add('amenities','アメニティセット','アメニティ',n>0?1:0,'組','洗顔料・スキンケアなど');
 add('shaver-charger','シェーバーの充電器','アメニティ',n>0&&t.chargers?1:0,'個');
 add('toothbrush-charger','電動歯ブラシの充電器','アメニティ',n>0&&t.chargers?1:0,'個');
 t.daily.forEach((d,index)=>{if(!d.travel)return;for(const mode of d.transports??[]){const label=TRANSPORTS.find(t=>t.id===mode)?.label??mode,prefix=`${index+1}日目 ${label}`;
 if(['train','flight','bus','rental'].includes(mode))add(`ticket-${index}-${mode}-booking`,`${prefix}：予約・購入を確認`,'移動・チケット',1,'件','予約内容・日付・区間・支払いを確認');
 if(['train','flight','bus'].includes(mode))add(`ticket-${index}-${mode}-ready`,`${prefix}：券・QR等を準備`,'移動・チケット',1,'件',mode==='flight'?'チェックイン方法・搭乗券の取得方法も確認':'当日使える状態か確認');
 if(mode==='local')add(`ticket-${index}-${mode}-ready`,`${prefix}：IC・乗車券を確認`,'移動・チケット',1,'件','残高や利用区間も確認');
 if(mode==='rental'||mode==='car')add(`ticket-${index}-${mode}-license`,`${prefix}：運転免許証`,'移動・チケット',1,'点');
 }});
 for(const c of s.custom) items.push({id:c.id,name:c.name,category:isWorkGear(c.name)?'仕事・電源':'自分で追加',qty:s.overrides[c.id]??c.qty,auto:c.qty,unit:'点',reason:'',worn:0,custom:true});
 return items;
}
export const isPacked=(s:PackingState,i:Item)=>i.qty>0&&(s.packed[i.id]??0)>=i.qty;
export function patchTrip(s:PackingState,patch:Partial<Trip>):PackingState {
 const t={...s.trip,...patch};
 if(patch.days!==undefined){if(!Number.isInteger(patch.days)||patch.days<1||patch.days>30)throw new Error('全日数は1〜30日で入力してください');t.daily=t.daily.slice(0,t.days);while(t.daily.length<t.days)t.daily.push({work:true,travel:false,private:false});}
 t.privateDays=t.daily.filter(d=>d.private).length;
 const next={...s,trip:t};validateState(next);return next;
}
export function migrateState(value:unknown):PackingState {
 const s=value as PackingState;
 if(s?.trip&&!Array.isArray(s.trip.daily)){const t=s.trip; t.daily=Array.from({length:t.days},(_,i)=>({work:i<t.days-t.privateDays,travel:false,private:i>=t.days-t.privateDays}));}
 return validateState(s);
}
