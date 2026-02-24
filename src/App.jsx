import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════
const C={
  bg:"#05060f",s1:"#090b18",s2:"#0e1120",s3:"#141828",s4:"#1a2035",
  border:"#1c2540",border2:"#243050",
  accent:"#f5a623",accentDim:"rgba(245,166,35,.12)",
  green:"#00e5b3",greenDim:"rgba(0,229,179,.1)",
  blue:"#4b8df8",blueDim:"rgba(75,141,248,.1)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,.1)",
  red:"#f43f5e",redDim:"rgba(244,63,94,.1)",
  warn:"#fbbf24",warnDim:"rgba(251,191,36,.1)",
  teal:"#06b6d4",tealDim:"rgba(6,182,212,.1)",
  text:"#e8edf5",muted:"#3d4e6a",muted2:"#6e829e",muted3:"#8899b0",
};
const G={
  card:{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"},
  btn:{padding:"9px 18px",borderRadius:9,fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",border:"none",display:"inline-flex",alignItems:"center",gap:7,fontWeight:600,transition:"all .15s"},
  input:{background:C.s2,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 14px",fontFamily:"'DM Mono',monospace",fontSize:12,color:C.text,outline:"none",width:"100%",boxSizing:"border-box"},
  label:{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:C.muted2,marginBottom:5,display:"block"},
  badge:{padding:"3px 10px",borderRadius:20,fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4},
  th:{textAlign:"left",padding:"10px 14px",fontSize:9,letterSpacing:1.4,textTransform:"uppercase",color:C.muted,borderBottom:`1px solid ${C.border}`,fontWeight:700,background:C.s2},
  td:{padding:"11px 14px",borderBottom:`1px solid rgba(28,37,64,.5)`,fontSize:12,verticalAlign:"middle"},
};

// ═══════════════════════════════════════════════════════════
// PLAN DEFINITIONS
// ═══════════════════════════════════════════════════════════
const PLANS={
  Starter:{price:799,yearly:7990,color:C.muted3,icon:"🔹",pumps:1,nozzles:4,staff:3,managers:1,creditCustomers:5,tanks:2,features:["1 Pump","4 Nozzles","3 Staff","Basic Reports","Email Alerts","Machine Testing"],noFeatures:["Multi-Pump","WhatsApp","GST Export","Consolidated Reports","Credit Mgmt (>5)"]},
  Pro:{price:2499,yearly:24990,color:C.accent,icon:"⚡",pumps:3,nozzles:20,staff:20,managers:5,creditCustomers:50,tanks:9,features:["3 Pumps","20 Nozzles","20 Staff","WhatsApp Alerts","PDF Export","Credit Customers","Consolidated Dashboard","Pump-wise Reports"],noFeatures:["Unlimited Pumps","Priority Support","Audit Logs"]},
  Enterprise:{price:5999,yearly:59990,color:C.green,icon:"🏆",pumps:999,nozzles:999,staff:999,managers:999,creditCustomers:999,tanks:999,features:["Unlimited Pumps","Unlimited Nozzles","Unlimited Staff","GST Export","Priority Support","Audit Logs","API Access","White Label"],noFeatures:[]},
};
const planRank={Starter:0,Pro:1,Enterprise:2};
const FUEL={
  rates:{Petrol:96.72,Diesel:89.62,CNG:94.00},
  colors:{Petrol:C.blue,Diesel:C.accent,CNG:C.green},
  hsn:{Petrol:"27101290",Diesel:"27101960",CNG:"27112100"},
};
const TEST_VARIANCE_PASS=50;
const TEST_VARIANCE_WARN=100;

// ═══════════════════════════════════════════════════════════
// SHIFT DEFINITIONS
// ═══════════════════════════════════════════════════════════
const SHIFTS=[
  {name:"Morning",   index:0, start:"06:00", end:"14:00", icon:"🌅", color:C.accent},
  {name:"Afternoon", index:1, start:"14:00", end:"22:00", icon:"☀️",  color:C.blue},
  {name:"Night",     index:2, start:"22:00", end:"06:00", icon:"🌙", color:C.purple},
];
const getCurrentShift=()=>{
  const h=new Date().getHours();
  if(h>=6&&h<14)  return SHIFTS[0];
  if(h>=14&&h<22) return SHIFTS[1];
  return SHIFTS[2];
};
const shiftKey=(date,shiftName,pumpId)=>`${pumpId}::${date}::${shiftName}`;

// ═══════════════════════════════════════════════════════════
// DATABASE — SHIFT-WISE ARCHITECTURE
// ═══════════════════════════════════════════════════════════
// Seed 7 days × 3 shifts × 6 pumps of realistic nozzle readings
const seedDate=(daysBack)=>{
  const d=new Date();d.setDate(d.getDate()-daysBack);
  return d.toISOString().split("T")[0];
};

// Build initial nozzle reading history (last 3 days, all shifts)
const buildNozzleReadings=()=>{
  const readings=[];
  // P1 nozzles: N-01(Petrol,start:48000), N-02(Petrol,start:31000), N-03(Diesel,start:22000), N-04(Diesel,start:19000)
  const nozzleSeeds=[
    {id:"N-01",pumpId:"P1",ownerId:"O1",fuel:"Petrol",  startOpen:48000.00, dailyVol:220},
    {id:"N-02",pumpId:"P1",ownerId:"O1",fuel:"Petrol",  startOpen:31000.00, dailyVol:195},
    {id:"N-03",pumpId:"P1",ownerId:"O1",fuel:"Diesel",  startOpen:22000.00, dailyVol:160},
    {id:"N-04",pumpId:"P1",ownerId:"O1",fuel:"Diesel",  startOpen:19000.00, dailyVol:140},
    {id:"N-05",pumpId:"P2",ownerId:"O1",fuel:"Petrol",  startOpen:62000.00, dailyVol:310},
    {id:"N-06",pumpId:"P2",ownerId:"O1",fuel:"Diesel",  startOpen:41000.00, dailyVol:270},
    {id:"N-07",pumpId:"P2",ownerId:"O1",fuel:"CNG",     startOpen:18900.00, dailyVol:80},
    {id:"N-08",pumpId:"P3",ownerId:"O1",fuel:"Petrol",  startOpen:55000.00, dailyVol:280},
    {id:"N-09",pumpId:"P3",ownerId:"O1",fuel:"Diesel",  startOpen:33000.00, dailyVol:200},
    {id:"N-10",pumpId:"P3",ownerId:"O1",fuel:"CNG",     startOpen:22100.00, dailyVol:90},
    {id:"N-01",pumpId:"P4",ownerId:"O2",fuel:"Petrol",  startOpen:29500.00, dailyVol:190},
    {id:"N-02",pumpId:"P4",ownerId:"O2",fuel:"Diesel",  startOpen:18000.00, dailyVol:150},
    {id:"N-01",pumpId:"P5",ownerId:"O3",fuel:"Petrol",  startOpen:71000.00, dailyVol:380},
    {id:"N-02",pumpId:"P5",ownerId:"O3",fuel:"Diesel",  startOpen:44000.00, dailyVol:290},
    {id:"N-03",pumpId:"P5",ownerId:"O3",fuel:"CNG",     startOpen:29800.00, dailyVol:110},
    {id:"N-01",pumpId:"P6",ownerId:"O3",fuel:"Petrol",  startOpen:61500.00, dailyVol:340},
    {id:"N-02",pumpId:"P6",ownerId:"O3",fuel:"Diesel",  startOpen:38000.00, dailyVol:260},
  ];
  // Build 3 days of history (days 3,2,1 = history; day 0 = today in progress)
  const shiftFracs=[0.35,0.40,0.25]; // Morning gets 35%, Afternoon 40%, Night 25%
  nozzleSeeds.forEach(ns=>{
    let curOpen=ns.startOpen;
    for(let d=3;d>=1;d--){
      const date=seedDate(d);
      for(let si=0;si<3;si++){
        const shiftVol=Math.round(ns.dailyVol*shiftFracs[si]*100)/100;
        const testVol=si===0?1.0:0; // Morning shift has machine test
        const netVol=shiftVol;
        const close=Math.round((curOpen+shiftVol+testVol)*100)/100;
        const revenue=Math.round(netVol*FUEL.rates[ns.fuel]);
        readings.push({
          id:`NR-${ns.pumpId}-${ns.id}-${date}-${SHIFTS[si].name}`.replace(/[^A-Za-z0-9-]/g,"-"),
          ownerId:ns.ownerId,pumpId:ns.pumpId,nozzleId:ns.id,fuel:ns.fuel,
          date,shift:SHIFTS[si].name,shiftIndex:si,
          openReading:Math.round(curOpen*100)/100,
          closeReading:close,
          testVol,netVol,saleVol:netVol,
          revenue,
          rate:FUEL.rates[ns.fuel],
          operator:"",
          status:"Submitted",
        });
        curOpen=close;
      }
    }
  });
  return readings;
};

const buildShiftReports=(nozzleReadings)=>{
  // Group readings by pumpId+date+shift → create shift report
  const groups={};
  nozzleReadings.forEach(nr=>{
    const k=`${nr.pumpId}::${nr.date}::${nr.shift}`;
    if(!groups[k])groups[k]={pumpId:nr.pumpId,ownerId:nr.ownerId,date:nr.date,shift:nr.shift,shiftIndex:nr.shiftIndex,readings:[],totalSales:0,cash:0,card:0,upi:0,creditOut:0,variance:0,status:"Submitted"};
    groups[k].readings.push(nr);
    groups[k].totalSales+=nr.revenue;
  });
  return Object.entries(groups).map(([k,g],i)=>{
    const cash=Math.round(g.totalSales*0.52);
    const card=Math.round(g.totalSales*0.29);
    const upi=g.totalSales-cash-card;
    const variance=Math.round((Math.random()-0.5)*400);
    return {
      id:`SR-${k.replace(/::/g,"-")}-${i}`,
      ownerId:g.ownerId,pumpId:g.pumpId,date:g.date,
      shift:g.shift,shiftIndex:g.shiftIndex,
      manager:"",status:"Submitted",
      totalSales:g.totalSales,cash,card,upi,creditOut:0,variance,
      nozzleCount:g.readings.length,
      readings:g.readings.map(nr=>nr.id),
    };
  });
};

const buildSales=(nozzleReadings)=>{
  const byPumpDate={};
  nozzleReadings.forEach(nr=>{
    const k=nr.pumpId+"::"+nr.date;
    if(!byPumpDate[k])byPumpDate[k]={date:nr.date,pumpId:nr.pumpId,ownerId:nr.ownerId,petrol:0,diesel:0,cng:0};
    if(nr.fuel==="Petrol")byPumpDate[k].petrol+=nr.revenue;
    else if(nr.fuel==="Diesel")byPumpDate[k].diesel+=nr.revenue;
    else byPumpDate[k].cng+=nr.revenue;
  });
  return Object.values(byPumpDate);
};

// Compute current open readings from history
const computeCurrentOpenReadings=(nozzleReadings,nozzleDefs)=>{
  return nozzleDefs.map(nd=>{
    const nrForNozzle=nozzleReadings.filter(nr=>nr.nozzleId===nd.id&&nr.pumpId===nd.pumpId&&nr.status==="Submitted").sort((a,b)=>{
      if(a.date!==b.date)return b.date.localeCompare(a.date);
      return b.shiftIndex-a.shiftIndex;
    });
    const latest=nrForNozzle[0];
    return {...nd, open:latest?latest.closeReading:nd.open, close:""};
  });
};

const NOZZLE_DEFS=[
  {id:"N-01",ownerId:"O1",pumpId:"P1",fuel:"Petrol",  open:48000.00,close:"",operator:"Amit Kumar",   status:"Active"},
  {id:"N-02",ownerId:"O1",pumpId:"P1",fuel:"Petrol",  open:31000.00,close:"",operator:"Amit Kumar",   status:"Active"},
  {id:"N-03",ownerId:"O1",pumpId:"P1",fuel:"Diesel",  open:22000.00,close:"",operator:"Rohit Singh",  status:"Active"},
  {id:"N-04",ownerId:"O1",pumpId:"P1",fuel:"Diesel",  open:19000.00,close:"",operator:"Rohit Singh",  status:"Active"},
  {id:"N-05",ownerId:"O1",pumpId:"P2",fuel:"Petrol",  open:62000.00,close:"",operator:"Ganesh Patil", status:"Active"},
  {id:"N-06",ownerId:"O1",pumpId:"P2",fuel:"Diesel",  open:41000.00,close:"",operator:"Ganesh Patil", status:"Active"},
  {id:"N-07",ownerId:"O1",pumpId:"P2",fuel:"CNG",     open:18900.00,close:"",operator:"Ganesh Patil", status:"Active"},
  {id:"N-08",ownerId:"O1",pumpId:"P3",fuel:"Petrol",  open:55000.00,close:"",operator:"Sachin More",  status:"Active"},
  {id:"N-09",ownerId:"O1",pumpId:"P3",fuel:"Diesel",  open:33000.00,close:"",operator:"Sachin More",  status:"Active"},
  {id:"N-10",ownerId:"O1",pumpId:"P3",fuel:"CNG",     open:22100.00,close:"",operator:"Sachin More",  status:"Idle"},
  {id:"N-01",ownerId:"O2",pumpId:"P4",fuel:"Petrol",  open:29500.00,close:"",operator:"Kavita Devi",  status:"Active"},
  {id:"N-02",ownerId:"O2",pumpId:"P4",fuel:"Diesel",  open:18000.00,close:"",operator:"Kavita Devi",  status:"Active"},
  {id:"N-01",ownerId:"O3",pumpId:"P5",fuel:"Petrol",  open:71000.00,close:"",operator:"Raj Sharma",   status:"Active"},
  {id:"N-02",ownerId:"O3",pumpId:"P5",fuel:"Diesel",  open:44000.00,close:"",operator:"Raj Sharma",   status:"Active"},
  {id:"N-03",ownerId:"O3",pumpId:"P5",fuel:"CNG",     open:29800.00,close:"",operator:"Raj Sharma",   status:"Active"},
  {id:"N-01",ownerId:"O3",pumpId:"P6",fuel:"Petrol",  open:61500.00,close:"",operator:"",             status:"Active"},
  {id:"N-02",ownerId:"O3",pumpId:"P6",fuel:"Diesel",  open:38000.00,close:"",operator:"",             status:"Active"},
];

const NOZZLE_READINGS_HISTORY=buildNozzleReadings();
const SHIFT_REPORTS_HISTORY=buildShiftReports(NOZZLE_READINGS_HISTORY);
const SALES_HISTORY=buildSales(NOZZLE_READINGS_HISTORY);
const NOZZLES_CURRENT=computeCurrentOpenReadings(NOZZLE_READINGS_HISTORY,NOZZLE_DEFS);

const DB={
  owners:[
    {id:"O1",name:"Rajesh Sharma",email:"rajesh@sharma.com",phone:"9876543210",password:"owner123",gst:"27AABCS1429B1Z1",plan:"Pro",billing:"monthly",status:"Active",startDate:"2025-02-01",endDate:"2025-03-01",daysUsed:21,amountPaid:2499,whatsapp:true,whatsappNum:"9876543210",avatar:"RS",city:"Pune",state:"Maharashtra"},
    {id:"O2",name:"Anil Gupta",email:"anil@gupta.com",phone:"9876543211",password:"anil123",gst:"",plan:"Starter",billing:"yearly",status:"Active",startDate:"2025-01-05",endDate:"2026-01-05",daysUsed:47,amountPaid:7990,whatsapp:false,whatsappNum:"",avatar:"AG",city:"Nashik",state:"Maharashtra"},
    {id:"O3",name:"Meena Krishnan",email:"meena@krishna.com",phone:"9876543212",password:"meena123",gst:"27AABCK5678B1Z3",plan:"Enterprise",billing:"monthly",status:"Active",startDate:"2025-02-01",endDate:"2025-03-01",daysUsed:21,amountPaid:5999,whatsapp:true,whatsappNum:"9876543212",avatar:"MK",city:"Mumbai",state:"Maharashtra"},
    {id:"O4",name:"Dinesh Rao",email:"dinesh@rao.com",phone:"9876543213",password:"dinesh123",gst:"",plan:"Starter",billing:"monthly",status:"Pending",startDate:"",endDate:"",daysUsed:0,amountPaid:0,whatsapp:false,whatsappNum:"",avatar:"DR",city:"Hyderabad",state:"Telangana"},
  ],
  pumps:[
    {id:"P1",ownerId:"O1",name:"Sharma Petrol Pump – Koregaon Park",shortName:"Koregaon",city:"Pune",state:"Maharashtra",address:"21 Lane 4, Koregaon Park, Pune",gst:"27AABCS1429B1Z1",status:"Active"},
    {id:"P2",ownerId:"O1",name:"Sharma Fuel Station – Kothrud",shortName:"Kothrud",city:"Pune",state:"Maharashtra",address:"88 Kothrud Main Rd, Pune",gst:"27AABCS1429B1Z1",status:"Active"},
    {id:"P3",ownerId:"O1",name:"Sharma CNG & Petrol – Hinjewadi",shortName:"Hinjewadi",city:"Pune",state:"Maharashtra",address:"IT Park Road, Hinjewadi Phase 1, Pune",gst:"27AABCS1429B1Z1",status:"Active"},
    {id:"P4",ownerId:"O2",name:"Gupta Fuel Station",shortName:"Gupta Fuel",city:"Nashik",state:"Maharashtra",address:"Trimbak Road, Nashik",gst:"",status:"Active"},
    {id:"P5",ownerId:"O3",name:"Krishna Petroleum – Andheri",shortName:"Andheri",city:"Mumbai",state:"Maharashtra",address:"Link Road, Andheri West, Mumbai",gst:"27AABCK5678B1Z3",status:"Active"},
    {id:"P6",ownerId:"O3",name:"Krishna Auto Fuels – Bandra",shortName:"Bandra",city:"Mumbai",state:"Maharashtra",address:"Carter Road, Bandra West, Mumbai",gst:"27AABCK5678B1Z3",status:"Active"},
  ],
  managers:[
    {id:"M1",ownerId:"O1",pumpId:"P1",name:"Vikram Desai",email:"vikram@sharma.com",password:"mgr123",phone:"9811000001",shift:"Morning",status:"Active",salary:22000},
    {id:"M2",ownerId:"O1",pumpId:"P2",name:"Suresh Naidu",email:"suresh@sharma.com",password:"mgr456",phone:"9811000002",shift:"Morning",status:"Active",salary:21000},
    {id:"M3",ownerId:"O1",pumpId:"P3",name:"Karan Wagh",email:"karan@sharma.com",password:"mgr789",phone:"9811000003",shift:"Morning",status:"Active",salary:21000},
    {id:"M4",ownerId:"O2",pumpId:"P4",name:"Priya Mehta",email:"priya@gupta.com",password:"mgr456",phone:"9811000004",shift:"Afternoon",status:"Active",salary:20000},
    {id:"M5",ownerId:"O3",pumpId:"P5",name:"Anita Shetty",email:"anita@krishna.com",password:"mgr111",phone:"9811000005",shift:"Morning",status:"Active",salary:23000},
    {id:"M6",ownerId:"O3",pumpId:"P6",name:"Deepak Nair",email:"deepak@krishna.com",password:"mgr222",phone:"9811000006",shift:"Afternoon",status:"Active",salary:22000},
  ],
  operators:[
    {id:"OP1",ownerId:"O1",pumpId:"P1",name:"Amit Kumar",email:"amit@sharma.com",password:"op123",phone:"9822000001",shift:"Morning",nozzles:["N-01","N-02"],present:true,salary:15000},
    {id:"OP2",ownerId:"O1",pumpId:"P1",name:"Rohit Singh",email:"rohit@sharma.com",password:"op456",phone:"9822000002",shift:"Morning",nozzles:["N-03","N-04"],present:true,salary:15000},
    {id:"OP3",ownerId:"O1",pumpId:"P2",name:"Ganesh Patil",email:"ganesh@sharma.com",password:"op789",phone:"9822000003",shift:"Morning",nozzles:["N-05","N-06"],present:true,salary:15000},
    {id:"OP4",ownerId:"O1",pumpId:"P3",name:"Sachin More",email:"sachin@sharma.com",password:"op321",phone:"9822000004",shift:"Morning",nozzles:["N-09","N-10"],present:false,salary:14000},
    {id:"OP5",ownerId:"O2",pumpId:"P4",name:"Kavita Devi",email:"kavita@gupta.com",password:"op789",phone:"9822000005",shift:"Afternoon",nozzles:["N-01"],present:false,salary:14000},
    {id:"OP6",ownerId:"O3",pumpId:"P5",name:"Raj Sharma",email:"raj@krishna.com",password:"op444",phone:"9822000006",shift:"Morning",nozzles:["N-01","N-02"],present:true,salary:16000},
  ],
  nozzles:NOZZLES_CURRENT,
  nozzleReadings:NOZZLE_READINGS_HISTORY,
  creditTxns:[
    {id:"CTX001",customerId:"CC1",type:"sale",amount:8500,desc:"Diesel fill — 94.8L",date:"2025-02-20",time:"09:14"},
    {id:"CTX002",customerId:"CC1",type:"payment",amount:15000,desc:"Cash payment",date:"2025-02-21",time:"11:30"},
    {id:"CTX003",customerId:"CC2",type:"sale",amount:12300,desc:"Petrol + Diesel",date:"2025-02-22",time:"14:05"},
    {id:"CTX004",customerId:"CC3",type:"sale",amount:5600,desc:"Petrol fill",date:"2025-02-23",time:"08:22"},
    {id:"CTX005",customerId:"CC3",type:"payment",amount:5000,desc:"UPI transfer",date:"2025-02-23",time:"18:00"},
  ],
  indents:[
    {id:"IND-1001",ownerId:"O1",pumpId:"P1",tankId:"T1",fuel:"Diesel",qty:5000,supplier:"Bharat Petroleum",deliveryDate:"2025-02-25",notes:"Urgent — stock critical",status:"Ordered",orderedAt:"2025-02-24"},
    {id:"IND-1002",ownerId:"O1",pumpId:"P2",tankId:"T3",fuel:"Petrol",qty:8000,supplier:"IOC Distributor",deliveryDate:"2025-02-26",notes:"",status:"Dispatched",orderedAt:"2025-02-22"},
    {id:"IND-1003",ownerId:"O1",pumpId:"P3",tankId:"T5",fuel:"CNG",qty:2000,supplier:"IGL Supplies",deliveryDate:"2025-02-20",notes:"",status:"Delivered",orderedAt:"2025-02-19"},
  ],
  shiftAuditLog:[],
  fuelRates:{Petrol:96.72,Diesel:89.62,CNG:94.00},  // ← NEW: full per-shift reading history
  tanks:[
    {id:"T1",ownerId:"O1",pumpId:"P1",fuel:"Petrol",capacity:20000,stock:14200,dip:142.0,updated:seedDate(0),alertAt:3000},
    {id:"T2",ownerId:"O1",pumpId:"P1",fuel:"Diesel",capacity:15000,stock:2400,dip:48.0,updated:seedDate(0),alertAt:2000},
    {id:"T3",ownerId:"O1",pumpId:"P2",fuel:"Petrol",capacity:25000,stock:18900,dip:189.0,updated:seedDate(0),alertAt:4000},
    {id:"T4",ownerId:"O1",pumpId:"P2",fuel:"Diesel",capacity:15000,stock:9200,dip:92.0,updated:seedDate(0),alertAt:2000},
    {id:"T5",ownerId:"O1",pumpId:"P2",fuel:"CNG",capacity:5000,stock:3800,dip:0,updated:seedDate(0),alertAt:500},
    {id:"T6",ownerId:"O1",pumpId:"P3",fuel:"Petrol",capacity:20000,stock:16000,dip:160.0,updated:seedDate(0),alertAt:3000},
    {id:"T7",ownerId:"O1",pumpId:"P3",fuel:"Diesel",capacity:12000,stock:8400,dip:84.0,updated:seedDate(0),alertAt:1500},
    {id:"T8",ownerId:"O2",pumpId:"P4",fuel:"Petrol",capacity:12000,stock:7800,dip:78.0,updated:seedDate(0),alertAt:2000},
    {id:"T9",ownerId:"O2",pumpId:"P4",fuel:"Diesel",capacity:8000,stock:4200,dip:42.0,updated:seedDate(0),alertAt:1000},
    {id:"T10",ownerId:"O3",pumpId:"P5",fuel:"Petrol",capacity:30000,stock:22400,dip:224.0,updated:seedDate(0),alertAt:5000},
    {id:"T11",ownerId:"O3",pumpId:"P5",fuel:"Diesel",capacity:20000,stock:14800,dip:148.0,updated:seedDate(0),alertAt:3000},
    {id:"T12",ownerId:"O3",pumpId:"P5",fuel:"CNG",capacity:8000,stock:5200,dip:0,updated:seedDate(0),alertAt:1000},
    {id:"T13",ownerId:"O3",pumpId:"P6",fuel:"Petrol",capacity:25000,stock:19200,dip:192.0,updated:seedDate(0),alertAt:4000},
    {id:"T14",ownerId:"O3",pumpId:"P6",fuel:"Diesel",capacity:15000,stock:11200,dip:112.0,updated:seedDate(0),alertAt:2000},
  ],
  creditCustomers:[
    {id:"CC1",ownerId:"O1",pumpId:"P1",name:"Sharma Transport Co.",phone:"9900001111",limit:50000,outstanding:18450,lastTxn:seedDate(1),status:"Active"},
    {id:"CC2",ownerId:"O1",pumpId:"P1",name:"Ravi Logistics",phone:"9900002222",limit:30000,outstanding:7200,lastTxn:seedDate(3),status:"Active"},
    {id:"CC3",ownerId:"O1",pumpId:"P1",name:"Patel Trucks",phone:"9900003333",limit:20000,outstanding:19800,lastTxn:seedDate(6),status:"Overdue"},
    {id:"CC4",ownerId:"O1",pumpId:"P2",name:"Kothrud Cabs",phone:"9900004444",limit:25000,outstanding:12000,lastTxn:seedDate(2),status:"Active"},
    {id:"CC5",ownerId:"O1",pumpId:"P3",name:"IT Park Buses",phone:"9900005555",limit:80000,outstanding:45000,lastTxn:seedDate(1),status:"Active"},
    {id:"CC6",ownerId:"O3",pumpId:"P5",name:"Andheri Auto Fleet",phone:"9900006666",limit:100000,outstanding:62000,lastTxn:seedDate(0),status:"Active"},
  ],
  shiftReports:SHIFT_REPORTS_HISTORY,  // ← NEW: shift reports with 3 shifts/day
  sales:SALES_HISTORY,
  machineTests:[
    {id:"MT-001",ownerId:"O1",pumpId:"P1",nozzleId:"N-01",fuel:"Petrol",date:seedDate(0),time:"07:12",operator:"Amit Kumar",qty:1.0,meterBefore:48201.40,meterAfter:48202.40,jarReading:1.0,variance:0,result:"Pass",returnedToTank:true,notes:"",shift:"Morning"},
    {id:"MT-002",ownerId:"O1",pumpId:"P1",nozzleId:"N-03",fuel:"Diesel",date:seedDate(0),time:"07:18",operator:"Rohit Singh",qty:1.0,meterBefore:22450.00,meterAfter:22451.15,jarReading:1.0,variance:150,result:"Warning",returnedToTank:true,notes:"Slight meter drift",shift:"Morning"},
    {id:"MT-003",ownerId:"O1",pumpId:"P2",nozzleId:"N-05",fuel:"Petrol",date:seedDate(0),time:"07:05",operator:"Ganesh Patil",qty:1.0,meterBefore:62100.80,meterAfter:62101.82,jarReading:1.02,variance:20,result:"Pass",returnedToTank:true,notes:"",shift:"Morning"},
    {id:"MT-004",ownerId:"O1",pumpId:"P3",nozzleId:"N-08",fuel:"Petrol",date:seedDate(0),time:"07:08",operator:"Sachin More",qty:1.0,meterBefore:55400.20,meterAfter:55401.45,jarReading:0.875,variance:125,result:"Fail",returnedToTank:false,notes:"Machine requires calibration immediately",shift:"Morning"},
  ],
  transactions:[
    {id:"TXN-8821",ownerId:"O1",plan:"Pro",billing:"monthly",amount:2949,base:2499,gst:450,credit:0,date:seedDate(21),method:"UPI",status:"Success",razorId:"pay_OxR7aK29nBm1",planActivated:true},
    {id:"TXN-8714",ownerId:"O1",plan:"Starter",billing:"monthly",amount:943,base:799,gst:144,credit:0,date:seedDate(52),method:"Card",status:"Success",razorId:"pay_NwQ6bJ18mAl0",planActivated:true},
    {id:"TXN-8699",ownerId:"O1",plan:"Pro",billing:"monthly",amount:2949,base:2499,gst:450,credit:0,date:seedDate(35),method:"UPI",status:"Failed",razorId:"pay_failEAk11x",planActivated:false,failReason:"Insufficient balance"},
    {id:"TXN-8890",ownerId:"O2",plan:"Starter",billing:"yearly",amount:9428,base:7990,gst:1438,credit:0,date:seedDate(47),method:"Card",status:"Success",razorId:"pay_PxS8cL30oNm2",planActivated:true},
    {id:"TXN-8901",ownerId:"O3",plan:"Enterprise",billing:"monthly",amount:7079,base:5999,gst:1080,credit:0,date:seedDate(21),method:"NetBanking",status:"Success",razorId:"pay_QyT9dM41pOn3",planActivated:true},
    {id:"TXN-8777",ownerId:"O3",plan:"Enterprise",billing:"monthly",amount:7079,base:5999,gst:1080,credit:0,date:seedDate(51),method:"Card",status:"Success",razorId:"pay_RzU0eN52qPo4",planActivated:true},
    {id:"TXN-8560",ownerId:"O4",plan:"Starter",billing:"monthly",amount:943,base:799,gst:144,credit:0,date:seedDate(3),method:"UPI",status:"Failed",razorId:"pay_failBbb22y",planActivated:false,failReason:"Payment gateway timeout"},
    {id:"TXN-8561",ownerId:"O4",plan:"Starter",billing:"monthly",amount:943,base:799,gst:144,credit:0,date:seedDate(2),method:"UPI",status:"Failed",razorId:"pay_failCcc33z",planActivated:false,failReason:"UPI declined by bank"},
  ],
  // WhatsApp message log per owner
  waLog:[
    {id:"WA001",ownerId:"O1",type:"payment",msg:"✅ Payment confirmed! Pro plan activated.",phone:"9876543210",date:seedDate(21),status:"Delivered"},
    {id:"WA002",ownerId:"O1",type:"alert",msg:"⚠️ Koregaon Park: Diesel tank critical — 2,400L",phone:"9876543210",date:seedDate(0),status:"Delivered"},
    {id:"WA003",ownerId:"O1",type:"shift",msg:"📋 Shift submitted: Koregaon · Morning · ₹1,24,580",phone:"9876543210",date:seedDate(1),status:"Delivered"},
    {id:"WA004",ownerId:"O1",type:"test",msg:"🔬 Machine test FAIL: N-08 at Hinjewadi",phone:"9876543210",date:seedDate(0),status:"Delivered"},
    {id:"WA005",ownerId:"O1",type:"shift",msg:"📋 Shift submitted: Kothrud · Morning · ₹98,450",phone:"9876543210",date:seedDate(1),status:"Failed"},
    {id:"WA006",ownerId:"O1",type:"alert",msg:"⚠️ Hinjewadi: Machine test WARN N-03",phone:"9876543210",date:seedDate(2),status:"Delivered"},
    {id:"WA007",ownerId:"O2",type:"payment",msg:"✅ Payment confirmed! Starter plan activated.",phone:"9876543211",date:seedDate(47),status:"Delivered"},
    {id:"WA008",ownerId:"O2",type:"shift",msg:"📋 Shift submitted: Gupta Fuel · Afternoon · ₹62,000",phone:"9876543211",date:seedDate(1),status:"Delivered"},
    {id:"WA009",ownerId:"O3",type:"payment",msg:"✅ Payment confirmed! Enterprise plan activated.",phone:"9876543212",date:seedDate(21),status:"Delivered"},
    {id:"WA010",ownerId:"O3",type:"shift",msg:"📋 Shift submitted: Andheri · Morning · ₹1,89,000",phone:"9876543212",date:seedDate(0),status:"Delivered"},
    {id:"WA011",ownerId:"O3",type:"alert",msg:"⚠️ Bandra: Stock running low — Diesel 11,200L",phone:"9876543212",date:seedDate(1),status:"Failed"},
    {id:"WA012",ownerId:"O3",type:"shift",msg:"📋 Shift submitted: Bandra · Afternoon · ₹1,65,000",phone:"9876543212",date:seedDate(0),status:"Delivered"},
  ],
  notifications:[
    {id:"N1",ownerId:"O1",pumpId:"P1",type:"alert",msg:"Diesel tank critical at P1 Koregaon — only 2,400L remaining",time:"10 min ago",read:false},
    {id:"N2",ownerId:"O1",pumpId:"P1",type:"warn",msg:"Machine test FAIL: N-08 at Hinjewadi — calibration required",time:"1 hr ago",read:false},
    {id:"N3",ownerId:"O1",pumpId:"P2",type:"info",msg:"Morning shift submitted — Kothrud by Suresh Naidu",time:"2 hr ago",read:true},
    {id:"N4",ownerId:"O1",pumpId:null,type:"success",msg:"Pro Plan renewed — valid till March 1, 2025",time:"3 days ago",read:true},
  ],
  coupons:[
    {id:"CPN1",code:"FIRST50",discount:50,type:"flat",uses:12,maxUses:100,status:"Active"},
    {id:"CPN2",code:"SAVE10",discount:10,type:"percent",uses:34,maxUses:200,status:"Active"},
    {id:"CPN3",code:"ANNUAL15",discount:15,type:"percent",uses:8,maxUses:50,status:"Active"},
  ],
  auditLog:[
    {id:"AL1",user:"admin@fuelos.in",role:"Admin",action:"Added owner: Dinesh Rao",time:seedDate(0)+" 09:12",ip:"103.21.44.1"},
    {id:"AL2",user:"rajesh@sharma.com",role:"Owner",action:"Added pump: Sharma CNG & Petrol – Hinjewadi",time:seedDate(11)+" 11:30",ip:"103.21.44.8"},
    {id:"AL3",user:"vikram@sharma.com",role:"Manager",action:"Submitted Morning shift SR-P1 — "+seedDate(1),time:seedDate(1)+" 14:02",ip:"103.21.44.9"},
    {id:"AL4",user:"rajesh@sharma.com",role:"Owner",action:"Upgraded plan: Starter → Pro",time:seedDate(21)+" 11:30",ip:"103.21.44.8"},
    {id:"AL5",user:"amit@sharma.com",role:"Operator",action:"Nozzle N-01 [P1] close reading entered: "+NOZZLES_CURRENT.find(n=>n.id==="N-01"&&n.pumpId==="P1")?.open,time:seedDate(0)+" 13:55",ip:"103.21.44.10"},
  ],
  services:[
    {name:"Razorpay Gateway",status:"Online",latency:112,uptime:99.97},
    {name:"Authentication API",status:"Online",latency:38,uptime:99.99},
    {name:"WhatsApp Notifications",status:"Degraded",latency:940,uptime:97.10},
    {name:"Nozzle Entry API",status:"Online",latency:61,uptime:99.95},
    {name:"Report Generator",status:"Online",latency:188,uptime:99.88},
    {name:"GST Export Service",status:"Online",latency:204,uptime:99.72},
    {name:"Biometric Bridge",status:"Offline",latency:null,uptime:93.40},
  ],
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const fmt=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
const fmtL=n=>n>=100000?`₹${(n/100000).toFixed(2)}L`:n>=1000?`₹${(n/1000).toFixed(1)}K`:fmt(n);
const fmtN=n=>Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
const todayS=()=>new Date().toISOString().split("T")[0];
const addMo=(d,m)=>{const dt=new Date(d||Date.now());dt.setMonth(dt.getMonth()+m);return dt.toISOString().split("T")[0];};
const totDays=b=>b==="yearly"?365:30;
const proRata=(amt,b,used)=>Math.round((amt/totDays(b))*(totDays(b)-used));
const daysDiff=(d1,d2)=>Math.max(0,Math.round((new Date(d2)-new Date(d1))/86400000));
const rid=()=>Math.random().toString(36).slice(2,10).toUpperCase();

const checkLimit=(owner,db,resource)=>{
  const p=PLANS[owner.plan];
  if(!p) return{ok:false,used:0,max:0};
  const counts={
    pumps:{used:db.pumps.filter(x=>x.ownerId===owner.id).length,max:p.pumps},
    nozzles:{used:db.nozzles.filter(n=>n.ownerId===owner.id).length,max:p.nozzles},
    staff:{used:db.managers.filter(m=>m.ownerId===owner.id).length+db.operators.filter(o=>o.ownerId===owner.id).length,max:p.staff},
    managers:{used:db.managers.filter(m=>m.ownerId===owner.id).length,max:p.managers},
    creditCustomers:{used:db.creditCustomers.filter(c=>c.ownerId===owner.id).length,max:p.creditCustomers},
    tanks:{used:db.tanks.filter(t=>t.ownerId===owner.id).length,max:p.tanks},
  };
  const d=counts[resource]||{used:0,max:999};
  return{ok:d.used<d.max,used:d.used,max:d.max};
};

const getNozzleTestStatus=(tests,nozzleId,pumpId,date)=>{
  const t=tests.filter(x=>x.nozzleId===nozzleId&&x.pumpId===pumpId&&x.date===date);
  if(!t.length)return"pending";
  if(t.some(x=>x.result==="Fail"))return"fail";
  if(t.some(x=>x.result==="Warning"))return"warning";
  if(t.every(x=>x.result==="Pass"))return"pass";
  return"pending";
};

const aggregateSales=(sales,pumpIds)=>{
  const filtered=pumpIds?sales.filter(s=>pumpIds.includes(s.pumpId)):sales;
  const byDate={};
  filtered.forEach(s=>{
    if(!byDate[s.date])byDate[s.date]={date:s.date,petrol:0,diesel:0,cng:0};
    byDate[s.date].petrol+=s.petrol;
    byDate[s.date].diesel+=s.diesel;
    byDate[s.date].cng+=s.cng;
  });
  return Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date));
};

// Get the open reading for a nozzle for a specific shift (= close of previous shift)
const getNozzleOpenForShift=(db,pumpId,nozzleId,date,shiftName)=>{
  const shiftIdx=SHIFTS.findIndex(s=>s.name===shiftName);
  if(shiftIdx===-1)return null;
  // Find previous shift
  let prevDate=date, prevShiftIdx=shiftIdx-1;
  if(prevShiftIdx<0){prevShiftIdx=2;const d=new Date(date);d.setDate(d.getDate()-1);prevDate=d.toISOString().split("T")[0];}
  const prevShift=SHIFTS[prevShiftIdx].name;
  // Look for submitted reading in nozzleReadings
  const prevReading=db.nozzleReadings.find(nr=>nr.pumpId===pumpId&&nr.nozzleId===nozzleId&&nr.date===prevDate&&nr.shift===prevShift&&nr.status==="Submitted");
  if(prevReading) return prevReading.closeReading;
  // Fallback: find latest submitted reading before this shift
  const allPrev=db.nozzleReadings.filter(nr=>nr.pumpId===pumpId&&nr.nozzleId===nozzleId&&nr.status==="Submitted"&&(nr.date<date||(nr.date===date&&nr.shiftIndex<shiftIdx))).sort((a,b)=>b.date!==a.date?b.date.localeCompare(a.date):b.shiftIndex-a.shiftIndex);
  if(allPrev.length) return allPrev[0].closeReading;
  // Ultimate fallback: current nozzle open
  const nozzle=db.nozzles.find(n=>n.id===nozzleId&&n.pumpId===pumpId);
  return nozzle?.open??null;
};

// Check if a shift has already been submitted
const isShiftSubmitted=(db,pumpId,date,shiftName)=>{
  return db.shiftReports.some(r=>r.pumpId===pumpId&&r.date===date&&r.shift===shiftName&&r.status==="Submitted");
};

// ═══════════════════════════════════════════════════════════
// SVG CHARTS
// ═══════════════════════════════════════════════════════════
const Spark=({data=[],color=C.accent,h=34,w=110})=>{
  if(data.length<2)return null;
  const max=Math.max(...data),min=Math.min(...data),range=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-3-((v-min)/range)*(h-8)}`).join(" ");
  const last=pts.split(" ").at(-1).split(",");
  return <svg width={w} height={h} style={{overflow:"visible"}}><polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/><circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r={3} fill={color}/></svg>;
};
const BarChart=({data=[],keys=[],colors=[],h=160})=>{
  const max=Math.max(...data.flatMap(d=>keys.map(k=>d[k]||0)),1);
  const bw=Math.max(4,Math.floor(250/Math.max(data.length*keys.length,1))-3);
  return <svg width="100%" height={h+28} viewBox={`0 0 300 ${h+28}`} preserveAspectRatio="none">
    {[.25,.5,.75,1].map(r=><line key={r} x1={0} x2={300} y1={h-r*(h-8)} y2={h-r*(h-8)} stroke={C.border} strokeWidth={.5} strokeDasharray="3,4"/>)}
    {data.map((d,di)=>keys.map((k,ki)=>{const val=d[k]||0,bh=Math.max(2,(val/max)*(h-8)),x=di*(keys.length*(bw+2)+6)+ki*(bw+2)+8;return <rect key={`${di}-${ki}`} x={x} y={h-bh} width={bw} height={bh} rx={2} fill={colors[ki]} opacity={.85}/>}))}
    {data.map((d,di)=><text key={di} x={di*(keys.length*(bw+2)+6)+8+bw*keys.length/2} y={h+18} textAnchor="middle" fontSize={8} fill={C.muted} fontFamily="DM Mono">{d.label||""}</text>)}
  </svg>;
};
const Donut=({segs=[],size=96})=>{
  const total=segs.reduce((s,g)=>s+g.v,0)||1;let cum=0;const r=34,cx=48,cy=48,sw=13;
  return <svg width={size} height={size} viewBox="0 0 96 96">
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.s2} strokeWidth={sw}/>
    {segs.map((g,i)=>{const pct=g.v/total,a1=cum*Math.PI*2-Math.PI/2,a2=(cum+pct)*Math.PI*2-Math.PI/2;const path=`M${(cx+r*Math.cos(a1)).toFixed(1)},${(cy+r*Math.sin(a1)).toFixed(1)} A${r},${r} 0 ${pct>.5?1:0},1 ${(cx+r*Math.cos(a2)).toFixed(1)},${(cy+r*Math.sin(a2)).toFixed(1)}`;cum+=pct;return <path key={i} d={path} fill="none" stroke={g.c} strokeWidth={sw} strokeLinecap="round" opacity={.9}/>;})}
    <text x={cx} y={cy+4} textAnchor="middle" fontSize={10} fill={C.text} fontFamily="Syne" fontWeight="800">{Math.round((segs[0]?.v||0)/total*100)}%</text>
  </svg>;
};
const MultiLineChart=({data=[],keys=[],colors=[],h=160})=>{
  if(!data.length)return null;
  const allVals=data.flatMap(d=>keys.map(k=>d[k]||0));
  const max=Math.max(...allVals,1);
  const w=300,pts=data.length;
  return <svg width="100%" height={h+24} viewBox={`0 0 ${w} ${h+24}`} preserveAspectRatio="none">
    {[.25,.5,.75,1].map(r=><line key={r} x1={0} x2={w} y1={h-r*(h-8)} y2={h-r*(h-8)} stroke={C.border} strokeWidth={.5} strokeDasharray="3,4"/>)}
    {keys.map((k,ki)=>{
      const line=data.map((d,i)=>`${(i/(pts-1))*w},${h-3-((d[k]||0)/max)*(h-8)}`).join(" ");
      return <polyline key={k} points={line} fill="none" stroke={colors[ki]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={.9}/>;
    })}
    {data.map((d,i)=><text key={i} x={(i/(pts-1))*w} y={h+18} textAnchor="middle" fontSize={7.5} fill={C.muted} fontFamily="DM Mono">{d.label||""}</text>)}
  </svg>;
};

// ═══════════════════════════════════════════════════════════
// SHARED UI ATOMS
// ═══════════════════════════════════════════════════════════
const Sb=({s})=>{
  const M={Active:[C.green,"rgba(0,229,179,.1)"],Success:[C.green,"rgba(0,229,179,.1)"],Online:[C.green,"rgba(0,229,179,.1)"],Submitted:[C.green,"rgba(0,229,179,.1)"],Pass:[C.green,"rgba(0,229,179,.1)"],Pending:[C.warn,"rgba(251,191,36,.1)"],Warning:[C.warn,"rgba(251,191,36,.1)"],Expired:[C.red,"rgba(244,63,94,.1)"],Offline:[C.red,"rgba(244,63,94,.1)"],Inactive:[C.red,"rgba(244,63,94,.1)"],Fail:[C.red,"rgba(244,63,94,.1)"],Degraded:[C.warn,"rgba(251,191,36,.1)"],Refunded:[C.blue,"rgba(75,141,248,.1)"],Overdue:[C.red,"rgba(244,63,94,.1)"],Idle:[C.muted2,"rgba(136,153,176,.1)"],Closed:[C.muted2,"rgba(136,153,176,.1)"]};
  const[cl,bg]=M[s]||[C.muted2,"rgba(136,153,176,.1)"];
  return <span style={{...G.badge,color:cl,background:bg}}><span style={{width:5,height:5,borderRadius:"50%",background:cl,display:"inline-block"}}/>{s}</span>;
};
const Kpi=({label,value,sub,accent=C.accent,icon,spark,trend,onClick})=>(
  <div onClick={onClick} style={{...G.card,padding:18,position:"relative",overflow:"hidden",cursor:onClick?"pointer":"default"}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.borderColor=accent;}} onMouseLeave={e=>{if(onClick)e.currentTarget.style.borderColor=C.border;}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:accent}}/>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:C.muted2}}>{label}</span><span style={{fontSize:16}}>{icon}</span></div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:C.text}}>{value}</div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
      {sub&&<div style={{fontSize:10,color:C.muted3}}>{sub}</div>}
      {trend!==undefined&&<div style={{fontSize:10,fontWeight:700,color:trend>=0?C.green:C.red}}>{trend>=0?"↑":"↓"}{Math.abs(trend)}%</div>}
    </div>
    {spark&&<div style={{marginTop:7}}><Spark data={spark} color={accent}/></div>}
  </div>
);
const Toggle=({on,onChange})=>(
  <div onClick={onChange} style={{cursor:"pointer",width:40,height:22,background:on?C.green:"#374151",borderRadius:11,position:"relative",transition:"background .2s",flexShrink:0}}>
    <div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:on?20:3,transition:"left .2s"}}/>
  </div>
);
const Bell=({notifs=[],onMarkAll})=>{
  const[open,setOpen]=useState(false);const unread=notifs.filter(n=>!n.read).length;
  const ic={alert:"🔴",warn:"🟡",success:"🟢",info:"🔵"};
  return <div style={{position:"relative"}}>
    <div onClick={()=>setOpen(o=>!o)} style={{cursor:"pointer",width:36,height:36,background:C.s2,borderRadius:9,border:`1px solid ${C.border}`,display:"grid",placeItems:"center",position:"relative"}}>
      <span style={{fontSize:15}}>🔔</span>
      {unread>0&&<div style={{position:"absolute",top:-5,right:-5,width:17,height:17,borderRadius:"50%",background:C.red,display:"grid",placeItems:"center",fontSize:9,fontWeight:800,color:"#fff",border:`2px solid ${C.bg}`}}>{unread}</div>}
    </div>
    {open&&<div style={{position:"absolute",top:44,right:0,width:330,background:C.s1,border:`1px solid ${C.border}`,borderRadius:13,boxShadow:"0 20px 60px rgba(0,0,0,.7)",zIndex:600,overflow:"hidden"}}>
      <div style={{padding:"11px 15px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>Notifications {unread>0&&<span style={{...G.badge,background:"rgba(244,63,94,.15)",color:C.red,marginLeft:5}}>{unread}</span>}</span>
        <button onClick={onMarkAll} style={{...G.btn,background:"transparent",color:C.blue,padding:"2px 8px",fontSize:10}}>Mark all read</button>
      </div>
      <div style={{maxHeight:300,overflowY:"auto"}}>
        {notifs.map(n=><div key={n.id} style={{padding:"10px 15px",borderBottom:`1px solid rgba(30,42,64,.4)`,background:!n.read?"rgba(75,141,248,.04)":"transparent",display:"flex",gap:10}}>
          <span style={{fontSize:13,flexShrink:0}}>{ic[n.type]||"🔵"}</span>
          <div style={{flex:1}}><div style={{fontSize:11,color:n.read?C.muted3:C.text,lineHeight:1.5}}>{n.msg}</div><div style={{fontSize:9,color:C.muted,marginTop:2}}>{n.time}</div></div>
          {!n.read&&<div style={{width:6,height:6,borderRadius:"50%",background:C.blue,marginTop:4,flexShrink:0}}/>}
        </div>)}
      </div>
    </div>}
  </div>;
};
const Tbl=({heads,children,scroll})=>{
  const inner=<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{heads.map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table>;
  return scroll?<div style={{overflowX:"auto"}}>{inner}</div>:inner;
};
const Topbar=({icon,ac,label,pump,db,notifs,onMarkAll,right})=>(
  <div style={{height:62,background:C.s1,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 22px",gap:12,position:"sticky",top:0,zIndex:200}}>
    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:30,height:30,background:ac,borderRadius:8,display:"grid",placeItems:"center",fontSize:14,color:ac===C.accent?"#000":"#fff",flexShrink:0}}>{icon}</div>
      Fuel<span style={{color:ac}}>OS</span>
    </div>
    <span style={{fontSize:9,color:C.muted,background:C.s2,borderRadius:6,padding:"3px 9px"}}>{label}</span>
    {pump&&<span style={{fontSize:11,color:C.muted2,fontWeight:600}}>⛽ {pump}</span>}
    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:9}}>
      {notifs&&<Bell notifs={notifs} onMarkAll={onMarkAll}/>}{right}
    </div>
  </div>
);
const Sidebar=({items,active,onNav,accent,footer})=>(
  <div style={{width:210,background:C.s1,borderRight:`1px solid ${C.border}`,minHeight:"calc(100vh - 62px)",display:"flex",flexDirection:"column",flexShrink:0}}>
    <div style={{flex:1,padding:"13px 0"}}>
      {items.map(it=>it.div?<div key={it.k} style={{height:1,background:C.border,margin:"9px 13px"}}/>:<div key={it.k} onClick={()=>onNav(it.k)} style={{padding:"9px 15px",cursor:"pointer",fontSize:11,borderLeft:`3px solid ${active===it.k?accent:"transparent"}`,background:active===it.k?`${accent}10`:"transparent",color:active===it.k?accent:C.muted2,transition:"all .14s",display:"flex",alignItems:"center",justifyContent:"space-between"}} onMouseEnter={e=>{if(active!==it.k){e.currentTarget.style.background="rgba(255,255,255,.02)";e.currentTarget.style.color=C.text;}}} onMouseLeave={e=>{if(active!==it.k){e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.muted2;}}}>
        <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13}}>{it.icon}</span>{it.label}</span>
        {it.badge&&<span style={{background:it.bc||C.red,color:"#fff",borderRadius:10,fontSize:8,padding:"1px 6px",fontWeight:800}}>{it.badge}</span>}
      </div>)}
    </div>
    {footer}
  </div>
);

// ── LIMIT BADGE: shows used/max with color coding
const LimitBar=({label,used,max,color=C.blue})=>{
  const pct=max>=999?0:Math.min(100,Math.round(used/max*100));
  const col=pct>=90?C.red:pct>=70?C.warn:color;
  if(max>=999)return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,color:C.muted3,padding:"4px 0"}}><span>{label}</span><span style={{color:C.green}}>Unlimited</span></div>;
  return <div style={{padding:"4px 0"}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted3,marginBottom:4}}>
      <span>{label}</span><span style={{color:col,fontWeight:700}}>{used}/{max}</span>
    </div>
    <div style={{height:3,background:C.s3,borderRadius:3}}><div style={{height:"100%",width:pct+"%",background:col,borderRadius:3,transition:"width .3s"}}/></div>
  </div>;
};

// ── PUMP PILL SELECTOR
const PumpPill=({pump,active,onClick,compact})=>(
  <div onClick={onClick} style={{padding:compact?"5px 10px":"7px 14px",borderRadius:8,cursor:"pointer",border:`1px solid ${active?pump._color||C.accent:C.border}`,background:active?`${pump._color||C.accent}12`:"transparent",color:active?pump._color||C.accent:C.muted3,fontSize:compact?9:10,fontWeight:700,transition:"all .14s",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
    <span style={{fontSize:compact?9:11}}>⛽</span>{pump.shortName||pump.name}
  </div>
);


// ─── NOZZLE EDIT ROW (inline editable meter reading + remove)
const NozzleEditRow=({nozzle,pumpColor,fc,onUpdateReading,onRemove,flash})=>{
  const[editing,setEditing]=useState(false);
  const[readingVal,setReadingVal]=useState(String(nozzle.open));
  const[confirmRemove,setConfirmRemove]=useState(false);
  const save=()=>{
    const v=parseFloat(readingVal);
    if(isNaN(v)||v<0){flash("⚠ Invalid reading");return;}
    onUpdateReading(nozzle.id,nozzle.pumpId,readingVal);
    setEditing(false);flash("✓ Reading updated for "+nozzle.id);
  };
  return <tr>
    <td style={{...G.td,fontWeight:700,color:fc}}>{nozzle.id}</td>
    <td style={G.td}><span style={{...G.badge,background:fc+"18",color:fc}}>{nozzle.fuel}</span></td>
    <td style={{...G.td}}>
      {editing?(
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input type="number" step="0.01" value={readingVal} onChange={e=>setReadingVal(e.target.value)}
            style={{...G.input,width:130,padding:"5px 9px",fontSize:11}}
            onFocus={e=>e.target.style.borderColor=pumpColor} onBlur={e=>e.target.style.borderColor=C.border}
            autoFocus onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")setEditing(false);}}/>
          <button onClick={save} style={{...G.btn,background:C.green,color:"#000",padding:"4px 10px",fontSize:10,fontWeight:700}}>✓</button>
          <button onClick={()=>{setEditing(false);setReadingVal(String(nozzle.open));}} style={{...G.btn,background:C.s3,color:C.muted2,padding:"4px 8px",fontSize:10}}>✕</button>
        </div>
      ):(
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:"monospace",fontSize:12,color:C.text}}>{Number(nozzle.open).toLocaleString("en-IN",{maximumFractionDigits:2})}</span>
          <button onClick={()=>{setReadingVal(String(nozzle.open));setEditing(true);}}
            style={{...G.btn,background:"transparent",border:`1px solid ${C.border}`,color:C.muted2,padding:"2px 7px",fontSize:9}}>✏</button>
        </div>
      )}
    </td>
    <td style={{...G.td,color:C.muted3,fontSize:11}}>{nozzle.operator||"—"}</td>
    <td style={G.td}><Sb s={nozzle.status}/></td>
    <td style={G.td}>
      {confirmRemove?(
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span style={{fontSize:10,color:C.red}}>Remove?</span>
          <button onClick={()=>{onRemove(nozzle.id,nozzle.pumpId);setConfirmRemove(false);}} style={{...G.btn,background:C.red,color:"#fff",padding:"3px 9px",fontSize:9,fontWeight:700}}>Yes</button>
          <button onClick={()=>setConfirmRemove(false)} style={{...G.btn,background:C.s3,color:C.muted2,padding:"3px 7px",fontSize:9}}>No</button>
        </div>
      ):(
        <button onClick={()=>setConfirmRemove(true)}
          style={{...G.btn,background:"rgba(244,63,94,.1)",color:C.red,border:"1px solid rgba(244,63,94,.3)",padding:"4px 10px",fontSize:10}}>
          − Remove
        </button>
      )}
    </td>
  </tr>;
};
// ═══════════════════════════════════════════════════════════
// GATEWAY (Razorpay Payment Simulator)
// ═══════════════════════════════════════════════════════════
const Gateway=({plan,billing,owner,onClose,onSuccess})=>{
  const[step,setStep]=useState("review");
  const[method,setMethod]=useState("upi");
  const[upi,setUpi]=useState("");
  const[coupon,setCoupon]=useState("");
  const[applied,setApplied]=useState(null);
  const[prog,setProg]=useState(0);
  const[err,setErr]=useState("");
  const p=PLANS[plan];
  const isUp=owner?.plan&&planRank[plan]>planRank[owner.plan];
  const credit=isUp&&owner?proRata(owner.amountPaid,owner.billing,owner.daysUsed):0;
  const base=billing==="yearly"?p.yearly:p.price;
  const disc=applied?applied.type==="flat"?applied.discount:Math.round(base*applied.discount/100):0;
  const afterDisc=Math.max(0,base-disc-credit);
  const gst=Math.round(afterDisc*.18);
  const total=afterDisc+gst;
  const applyCode=()=>{const c=DB.coupons.find(x=>x.code===coupon.toUpperCase()&&x.status==="Active");if(c){setApplied(c);setErr("");}else setErr("Invalid code");};
  const pay=()=>{if(method==="upi"&&!upi.includes("@"))return;setStep("processing");setProg(0);const id=`pay_${rid()}`;let p2=0;const iv=setInterval(()=>{p2+=Math.random()*18+4;if(p2>=100){clearInterval(iv);setStep("success");onSuccess({plan,billing,amount:total,base:afterDisc,gst,credit,txnId:id,method:method.toUpperCase()});}else setProg(Math.min(99,p2));},120);};
  const steps=["review","method","processing","success"];const si=steps.indexOf(step);
  return <div style={{position:"fixed",inset:0,background:"rgba(5,6,15,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}}>
    <div style={{...G.card,width:460,maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.accent},${C.green})`}}/>
      {step!=="processing"&&step!=="success"&&<button onClick={onClose} style={{...G.btn,background:"transparent",color:C.muted2,padding:"6px",position:"absolute",top:12,right:12,fontSize:16}}>✕</button>}
      <div style={{padding:"9px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:4,alignItems:"center"}}>
        {["Plan","Payment","Processing","Done"].map((s,i)=><><span key={s} style={{fontSize:10,color:i<=si?C.accent:C.muted,fontWeight:i===si?700:400}}>{s}</span>{i<3&&<div style={{flex:1,height:1,background:i<si?C.accent:C.border,margin:"0 8px"}}/>}</>)}
      </div>
      <div style={{padding:22}}>
        {step==="review"&&<div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,marginBottom:4}}>{p.icon} {plan} Plan</div>
          <div style={{fontSize:11,color:C.muted3,marginBottom:18}}>{billing==="yearly"?"Annual":"Monthly"} subscription · {p.pumps>=999?"Unlimited":p.pumps} Pump{p.pumps!==1?"s":""}</div>
          {isUp&&credit>0&&<div style={{background:"rgba(0,229,179,.06)",border:`1px solid rgba(0,229,179,.2)`,borderRadius:9,padding:"10px 14px",marginBottom:14,fontSize:11,color:C.green}}>✓ Pro-rata credit from current plan: {fmt(credit)}</div>}
          <div style={{background:C.s2,borderRadius:10,padding:"13px 15px",marginBottom:14}}>
            {[[`${billing==="yearly"?"Annual":"Monthly"} Fee`,fmt(base)],[`Coupon Discount`,applied?`-${fmt(disc)}`:"-"],[`Upgrade Credit`,credit>0?`-${fmt(credit)}`:"-"],[`Taxable Amount`,fmt(afterDisc)],[`GST (18%)`,fmt(gst)],["─────","─────"],[`Total Payable`,fmt(total)]].map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:7,color:k==="Total Payable"?C.accent:k==="─────"?C.muted:C.text,fontWeight:k==="Total Payable"?"800":"400"}}><span style={{color:k==="─────"?C.border:undefined}}>{k}</span><span>{v}</span></div>)}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Coupon code" style={{...G.input,flex:1}}/>
            <button onClick={applyCode} style={{...G.btn,background:C.blue,color:"#fff",whiteSpace:"nowrap"}}>Apply</button>
          </div>
          {err&&<div style={{fontSize:10,color:C.red,marginBottom:10}}>⚠ {err}</div>}
          {applied&&<div style={{fontSize:10,color:C.green,marginBottom:10}}>✓ {applied.code}: {applied.type==="flat"?fmt(applied.discount):applied.discount+"%"} off</div>}
          <button onClick={()=>setStep("method")} style={{...G.btn,width:"100%",justifyContent:"center",background:C.accent,color:"#000",padding:12,fontSize:13,fontWeight:700}}>Proceed to Payment →</button>
        </div>}
        {step==="method"&&<div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,marginBottom:16}}>Choose Payment Method</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:18}}>
            {[["upi","📱 UPI"],["card","💳 Card"],["netbanking","🏦 Net Banking"],["wallet","👛 Wallet"]].map(([k,l])=><div key={k} onClick={()=>setMethod(k)} style={{padding:"12px",borderRadius:9,border:`1px solid ${method===k?C.accent:C.border}`,background:method===k?C.accentDim:"transparent",cursor:"pointer",textAlign:"center",fontSize:11,fontWeight:method===k?700:400,color:method===k?C.accent:C.muted3,transition:"all .13s"}}>{l}</div>)}
          </div>
          {method==="upi"&&<div style={{marginBottom:15}}><label style={G.label}>UPI ID</label><input style={G.input} value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@upi"/></div>}
          {method==="card"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:15}}><div><label style={G.label}>Card Number</label><input style={G.input} placeholder="•••• •••• •••• ••••"/></div><div><label style={G.label}>Name on Card</label><input style={G.input} placeholder="Full Name"/></div><div><label style={G.label}>Expiry</label><input style={G.input} placeholder="MM/YY"/></div><div><label style={G.label}>CVV</label><input style={G.input} placeholder="•••" type="password"/></div></div>}
          {method==="netbanking"&&<div style={{marginBottom:15}}><label style={G.label}>Bank</label><select style={{...G.input,cursor:"pointer"}}><option>SBI</option><option>HDFC</option><option>ICICI</option><option>Axis</option><option>Kotak</option></select></div>}
          {method==="wallet"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:15}}>{["Paytm","PhonePe","Amazon Pay","Mobikwik"].map(w=><div key={w} style={{padding:"10px",borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer",textAlign:"center",fontSize:10,color:C.muted3}}>{w}</div>)}</div>}
          <div style={{display:"flex",gap:9}}>
            <button onClick={()=>setStep("review")} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,flex:1,justifyContent:"center"}}>← Back</button>
            <button onClick={pay} style={{...G.btn,background:C.accent,color:"#000",flex:2,justifyContent:"center",fontWeight:700}}>Pay {fmt(total)}</button>
          </div>
        </div>}
        {step==="processing"&&<div style={{textAlign:"center",padding:"28px 0"}}>
          <div style={{fontSize:42,marginBottom:18}}>⚡</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,marginBottom:18}}>Processing Payment…</div>
          <div style={{height:6,background:C.s2,borderRadius:3,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:prog+"%",background:`linear-gradient(90deg,${C.accent},${C.green})`,transition:"width .12s",borderRadius:3}}/></div>
          <div style={{fontSize:10,color:C.muted3}}>Razorpay secure gateway · {Math.round(prog)}%</div>
        </div>}
        {step==="success"&&<div style={{padding:"8px 0"}}>
          <div style={{textAlign:"center",marginBottom:18}}>
            <div style={{fontSize:52,marginBottom:8}}>✅</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:C.green,marginBottom:4}}>Payment Successful!</div>
            <div style={{fontSize:11,color:C.muted3}}>{billing==="yearly"?"Annual":"Monthly"} billing · Secure payment via Razorpay</div>
          </div>
          {/* Auto plan activation confirmation */}
          <div style={{background:`linear-gradient(135deg,rgba(0,229,179,.1),rgba(75,141,248,.08))`,border:`1px solid rgba(0,229,179,.3)`,borderRadius:12,padding:"14px 18px",marginBottom:14}}>
            <div style={{fontWeight:700,color:C.green,fontSize:12,marginBottom:10}}>⚡ Plan Automatically Activated</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Plan",`${PLANS[plan]?.icon} ${plan}`],["Billing",billing==="yearly"?"Annual (12 months)":"Monthly"],["Amount",`${fmt(total)} incl. GST`],["Valid Till",addMo(todayS(),billing==="yearly"?12:1)]].map(([k,v])=><div key={k} style={{background:"rgba(5,6,15,.4)",borderRadius:8,padding:"8px 11px"}}>
                <div style={{fontSize:8,color:C.muted3,marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>{k}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.text}}>{v}</div>
              </div>)}
            </div>
          </div>
          <div style={{background:C.s2,borderRadius:9,padding:"10px 14px",marginBottom:14}}>
            <div style={{fontSize:9,color:C.muted3,marginBottom:5}}>What's unlocked with {plan}:</div>
            {(PLANS[plan]?.features||[]).slice(0,4).map(f=><div key={f} style={{fontSize:10,color:C.green,display:"flex",gap:6,marginBottom:3}}><span>✓</span>{f}</div>)}
          </div>
          <div style={{fontSize:9,color:C.muted3,textAlign:"center",marginBottom:14}}>Receipt sent via email · WhatsApp confirmation sent to registered number</div>
          <button onClick={onClose} style={{...G.btn,background:`linear-gradient(90deg,${C.green},${C.blue})`,color:"#000",padding:"11px 28px",fontWeight:800,fontSize:13,width:"100%",justifyContent:"center",borderRadius:10}}>✓ Go to Dashboard →</button>
        </div>}
      </div>
    </div>
  </div>;
};

// ═══════════════════════════════════════════════════════════
// MACHINE TEST FORM
// ═══════════════════════════════════════════════════════════
const MachineTestForm=({nozzles,operators,pumpId,ownerId,db,setDb,onClose,flash})=>{
  const[step,setStep]=useState(1);
  const[form,setForm]=useState({nozzleId:nozzles[0]?.id||"",shift:"Morning",date:todayS(),time:new Date().toTimeString().slice(0,5),operator:operators[0]?.name||"",qty:"1.0",returnedToTank:true,meterBefore:"",meterAfter:"",jarReading:"",notes:""});
  const variance=form.jarReading&&form.qty?Math.round(Math.abs(parseFloat(form.qty)-parseFloat(form.jarReading))*1000):null;
  const autoResult=variance===null?"Pending":variance<=TEST_VARIANCE_PASS?"Pass":variance<=TEST_VARIANCE_WARN?"Warning":"Fail";
  const selNozzle=nozzles.find(n=>n.id===form.nozzleId);
  const save=()=>{
    const test={id:`MT-${rid()}`,ownerId,pumpId:pumpId||selNozzle?.pumpId,nozzleId:form.nozzleId,fuel:selNozzle?.fuel||"Petrol",date:form.date,time:form.time,operator:form.operator,qty:parseFloat(form.qty)||1,meterBefore:parseFloat(form.meterBefore)||0,meterAfter:parseFloat(form.meterAfter)||0,jarReading:parseFloat(form.jarReading)||0,variance,result:autoResult,returnedToTank:form.returnedToTank,notes:form.notes,shift:form.shift};
    setDb(d=>({...d,machineTests:[test,...(d.machineTests||[])]}));
    flash&&flash("✓ Machine test recorded: "+form.nozzleId+" — "+autoResult);
    onClose&&onClose();
  };
  const varCol=variance===null?C.muted2:variance<=TEST_VARIANCE_PASS?C.green:variance<=TEST_VARIANCE_WARN?C.warn:C.red;
  return <div style={{position:"fixed",inset:0,background:"rgba(5,6,15,.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900,backdropFilter:"blur(6px)"}}>
    <div style={{...G.card,width:500,maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.teal},${C.blue})`}}/>
      <button onClick={onClose} style={{...G.btn,background:"transparent",color:C.muted2,padding:"6px",position:"absolute",top:12,right:14,fontSize:16}}>✕</button>
      <div style={{padding:"16px 22px 12px"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,color:C.teal}}>🔬 Machine Test Entry</div>
        <div style={{fontSize:10,color:C.muted3,marginTop:2}}>W&amp;M Act compliance · Qty excluded from sales &amp; GST</div>
      </div>
      <div style={{padding:"9px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:4,alignItems:"center"}}>
        {["Setup","Record","Confirm"].map((s,i)=><><span key={s} style={{fontSize:10,color:i+1<=step?C.teal:C.muted,fontWeight:i+1===step?700:400}}>{s}</span>{i<2&&<div style={{flex:1,height:1,background:i+1<step?C.teal:C.border,margin:"0 8px"}}/>}</>)}
      </div>
      <div style={{padding:22}}>
        {step===1&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:13}}>
            <div><label style={G.label}>Nozzle</label><select value={form.nozzleId} onChange={e=>setForm(f=>({...f,nozzleId:e.target.value}))} style={{...G.input,cursor:"pointer"}}>{nozzles.map(n=><option key={n.id+n.pumpId} value={n.id}>{n.id} · {n.fuel}</option>)}</select></div>
            <div><label style={G.label}>Shift</label><select value={form.shift} onChange={e=>setForm(f=>({...f,shift:e.target.value}))} style={{...G.input,cursor:"pointer"}}>{["Morning","Afternoon","Night"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label style={G.label}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={G.input}/></div>
            <div><label style={G.label}>Time</label><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={G.input}/></div>
            <div><label style={G.label}>Operator</label><select value={form.operator} onChange={e=>setForm(f=>({...f,operator:e.target.value}))} style={{...G.input,cursor:"pointer"}}>{operators.map(o=><option key={o.id}>{o.name}</option>)}</select></div>
            <div><label style={G.label}>Extract Qty (L)</label><input type="number" step="0.1" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} style={G.input}/></div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.s2,borderRadius:9,padding:"10px 14px",marginBottom:16}}>
            <span style={{fontSize:11,color:C.muted3}}>Fuel returned to tank after test</span>
            <Toggle on={form.returnedToTank} onChange={()=>setForm(f=>({...f,returnedToTank:!f.returnedToTank}))}/>
          </div>
          <div style={{background:"rgba(6,182,212,.06)",border:`1px solid rgba(6,182,212,.2)`,borderRadius:9,padding:"10px 14px",marginBottom:16,fontSize:10,color:C.teal,lineHeight:1.7}}>
            ℹ Protocol: Extract exactly {form.qty}L into certified jar · Record meter readings before/after · Measure actual jar volume · Variance {"≤"}50ml = Pass
          </div>
          <button onClick={()=>setStep(2)} style={{...G.btn,width:"100%",justifyContent:"center",background:C.teal,color:"#000",padding:10,fontWeight:700}}>Next: Record Readings →</button>
        </div>}
        {step===2&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:13}}>
            <div><label style={G.label}>Meter Before</label><input type="number" step="0.01" value={form.meterBefore} onChange={e=>setForm(f=>({...f,meterBefore:e.target.value}))} style={G.input}/></div>
            <div><label style={G.label}>Meter After</label><input type="number" step="0.01" value={form.meterAfter} onChange={e=>setForm(f=>({...f,meterAfter:e.target.value}))} style={G.input}/></div>
            <div><label style={G.label}>Meter Diff (auto)</label><div style={{...G.input,opacity:.7,fontFamily:"monospace",color:(()=>{const d=parseFloat(form.meterAfter)-parseFloat(form.meterBefore);return isNaN(d)||d<0?C.red:C.text;})()}}>{(()=>{const d=parseFloat(form.meterAfter)-parseFloat(form.meterBefore);return isNaN(d)||d<0?"—":d.toFixed(3)+"L";})()}</div></div>
            <div><label style={G.label}>Jar Reading (L)</label><input type="number" step="0.001" value={form.jarReading} onChange={e=>setForm(f=>({...f,jarReading:e.target.value}))} style={G.input}/></div>
          </div>
          {variance!==null&&<div style={{background:variance<=TEST_VARIANCE_PASS?"rgba(0,229,179,.07)":variance<=TEST_VARIANCE_WARN?"rgba(251,191,36,.07)":"rgba(244,63,94,.07)",border:`1px solid ${varCol}30`,borderRadius:9,padding:"12px 15px",marginBottom:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:9,color:C.muted2,letterSpacing:1,textTransform:"uppercase"}}>Variance</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:varCol}}>{variance}ml</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:9,color:C.muted2,letterSpacing:1,textTransform:"uppercase"}}>Result</div><Sb s={autoResult}/></div>
          </div>}
          <div style={{marginBottom:13}}><label style={G.label}>Notes</label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Observations…" style={G.input}/></div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={()=>setStep(1)} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,flex:1,justifyContent:"center"}}>← Back</button>
            <button onClick={()=>setStep(3)} disabled={!form.meterBefore||!form.meterAfter||!form.jarReading} style={{...G.btn,background:C.teal,color:"#000",flex:2,justifyContent:"center",fontWeight:700,opacity:(!form.meterBefore||!form.meterAfter||!form.jarReading)?.5:1}}>Review →</button>
          </div>
        </div>}
        {step===3&&<div>
          <div style={{background:C.s2,borderRadius:10,padding:"15px",marginBottom:14}}>
            {[["Nozzle",form.nozzleId+" · "+(selNozzle?.fuel||"")],["Operator",form.operator],["Date/Time",form.date+" "+form.time],["Extract Qty",form.qty+"L"],["Variance",variance+"ml"],["Result",autoResult],["Returned to Tank",form.returnedToTank?"Yes ✓":"No ✗"]].map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:7}}><span style={{color:C.muted3}}>{k}</span><span style={{fontWeight:600,color:k==="Result"?varCol:C.text}}>{v}</span></div>)}
          </div>
          <div style={{background:"rgba(6,182,212,.06)",border:"1px solid rgba(6,182,212,.2)",borderRadius:8,padding:"9px 13px",marginBottom:14,fontSize:10,color:C.teal}}>
            ✓ {form.qty}L will be excluded from sales &amp; revenue for {form.date}
          </div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={()=>setStep(2)} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,flex:1,justifyContent:"center"}}>← Back</button>
            <button onClick={save} style={{...G.btn,background:C.green,color:"#000",flex:2,justifyContent:"center",fontWeight:700}}>✓ Save Test Record</button>
          </div>
        </div>}
      </div>
    </div>
  </div>;
};

// ═══════════════════════════════════════════════════════════
// MACHINE TEST LOG
// ═══════════════════════════════════════════════════════════
const MachineTestLog=({tests,nozzles,pumps,showFilter})=>{
  const[filterDate,setFilterDate]=useState("");
  const[filterPump,setFilterPump]=useState("all");
  const[filterResult,setFilterResult]=useState("all");
  const filtered=tests.filter(t=>{
    if(filterDate&&t.date!==filterDate)return false;
    if(filterPump!=="all"&&t.pumpId!==filterPump)return false;
    if(filterResult!=="all"&&t.result!==filterResult)return false;
    return true;
  });
  const totalQty=filtered.reduce((s,t)=>s+t.qty,0);
  const returnedQty=filtered.filter(t=>t.returnedToTank).reduce((s,t)=>s+t.qty,0);
  const failures=filtered.filter(t=>t.result==="Fail").length;
  return <div>
    {showFilter&&<div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:12}}>
      {pumps&&<select value={filterPump} onChange={e=>setFilterPump(e.target.value)} style={{...G.input,width:"auto",fontSize:10,padding:"6px 10px"}}>
        <option value="all">All Pumps</option>
        {pumps.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}
      </select>}
      <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{...G.input,width:130,fontSize:10,padding:"6px 10px"}}/>
      <select value={filterResult} onChange={e=>setFilterResult(e.target.value)} style={{...G.input,width:"auto",fontSize:10,padding:"6px 10px"}}>
        <option value="all">All Results</option>
        {["Pass","Warning","Fail","Pending"].map(r=><option key={r}>{r}</option>)}
      </select>
      {(filterDate||filterPump!=="all"||filterResult!=="all")&&<button onClick={()=>{setFilterDate("");setFilterPump("all");setFilterResult("all");}} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"6px 10px",fontSize:10}}>Clear ✕</button>}
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
      {[[`${filtered.length} Tests`,totalQty.toFixed(2)+"L total",C.teal],[`${returnedQty.toFixed(2)}L Returned`,`${filtered.filter(t=>t.returnedToTank).length} tests`,C.green],[`${failures} Fail${failures!==1?"s":""}`,`${filtered.filter(t=>t.result==="Warning").length} warnings`,failures>0?C.red:C.muted3],[`${filtered.filter(t=>t.result==="Pass").length} Pass`,`${Math.round(filtered.filter(t=>t.result==="Pass").length/Math.max(1,filtered.length)*100)}% accuracy`,C.green]].map(([v,s,c])=><div key={v} style={{background:C.s2,borderRadius:9,padding:"10px 12px",border:`1px solid ${C.border}`}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:C.muted3,marginTop:2}}>{s}</div></div>)}
    </div>
    <Tbl scroll heads={["ID","Pump","Nozzle","Fuel","Date","Time","Operator","Extract","Variance","Returned","Result"]}>
      {filtered.map(t=>{
        const vc=t.variance<=TEST_VARIANCE_PASS?C.green:t.variance<=TEST_VARIANCE_WARN?C.warn:C.red;
        const pump=pumps?.find(p=>p.id===t.pumpId);
        return <tr key={t.id}>
          <td style={{...G.td,fontFamily:"monospace",fontSize:10,color:C.muted3}}>{t.id}</td>
          {pumps&&<td style={{...G.td,fontSize:10}}>{pump?.shortName||t.pumpId}</td>}
          <td style={G.td}>{t.nozzleId}</td>
          <td style={G.td}><span style={{...G.badge,background:FUEL.colors[t.fuel]+"18",color:FUEL.colors[t.fuel]}}>{t.fuel}</span></td>
          <td style={{...G.td,color:C.muted3}}>{t.date}</td>
          <td style={{...G.td,color:C.muted3}}>{t.time}</td>
          <td style={G.td}>{t.operator}</td>
          <td style={G.td}>{t.qty}L</td>
          <td style={{...G.td,fontFamily:"monospace",fontWeight:700,color:vc}}>{t.variance}ml</td>
          <td style={{...G.td,color:t.returnedToTank?C.green:C.red}}>{t.returnedToTank?"✓":"✗"}</td>
          <td style={G.td}><Sb s={t.result}/></td>
        </tr>;
      })}
    </Tbl>
  </div>;
};

// ═══════════════════════════════════════════════════════════
// ⚡ NEW v7 FEATURES — Fuel Price Manager, Indent System,
//    Advanced Analytics, PDF Export, Credit Full CRUD,
//    Shift Audit, Push Notification Centre, Razorpay live flow
// ═══════════════════════════════════════════════════════════

// ── Fuel Price Manager Component
const FuelPriceManager=({db,setDb,ownerId,flash})=>{
  const[prices,setPrices]=useState({...FUEL.rates});
  const[pumpPrices,setPumpPrices]=useState({});
  const[mode,setMode]=useState("global"); // global | per-pump
  const myPumps=db.pumps.filter(p=>p.ownerId===ownerId);
  const save=()=>{
    // Update global rates in DB
    setDb(d=>({...d,fuelRates:{...d.fuelRates,...prices}}));
    flash("✓ Fuel prices updated — effective from next shift");
  };
  return <div style={{display:"flex",flexDirection:"column",gap:15}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>⛽ Fuel Price Manager</div><div style={{fontSize:11,color:C.muted3,marginTop:2}}>Set petrol, diesel and CNG rates per pump or globally</div></div>
      <div style={{display:"flex",gap:8}}>
        {["global","per-pump"].map(m=><button key={m} onClick={()=>setMode(m)} style={{...G.btn,background:mode===m?C.accent:C.s2,color:mode===m?"#000":C.muted2,border:`1px solid ${mode===m?C.accent:C.border}`}}>{m==="global"?"🌍 Global":"⛽ Per Pump"}</button>)}
      </div>
    </div>
    {/* Live rate cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      {["Petrol","Diesel","CNG"].map(f=><div key={f} style={{...G.card,padding:18,borderTop:`3px solid ${FUEL.colors[f]}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:FUEL.colors[f]}}>{f}</span>
          <span style={{...G.badge,background:FUEL.colors[f]+"18",color:FUEL.colors[f]}}>{FUEL.hsn[f]}</span>
        </div>
        <div style={{fontSize:28,fontWeight:800,fontFamily:"'Syne',sans-serif",color:C.text,marginBottom:6}}>₹{prices[f]}</div>
        <div style={{fontSize:9,color:C.muted3,marginBottom:10}}>per litre{f==="CNG"?" (kg)":""}</div>
        <input type="number" step="0.01" value={prices[f]} onChange={e=>setPrices(p=>({...p,[f]:parseFloat(e.target.value)||0}))} style={{...G.input,fontSize:14,fontWeight:700,textAlign:"center",padding:"8px 12px"}}/>
      </div>)}
    </div>
    {mode==="per-pump"&&<div style={G.card}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>Per-Pump Rate Override</div>
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
        {myPumps.map(p=><div key={p.id} style={{background:C.s2,borderRadius:10,padding:14}}>
          <div style={{fontWeight:700,marginBottom:10,color:C.muted3,fontSize:11}}>{p.name}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {["Petrol","Diesel","CNG"].map(f=><div key={f}>
              <label style={{...G.label,color:FUEL.colors[f]}}>{f}</label>
              <input type="number" step="0.01" defaultValue={prices[f]} onChange={e=>setPumpPrices(prev=>({...prev,[p.id+f]:parseFloat(e.target.value)||prices[f]}))} style={{...G.input,fontSize:12,padding:"7px 10px"}}/>
            </div>)}
          </div>
        </div>)}
      </div>
    </div>}
    {/* Rate change log */}
    <div style={G.card}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>📋 Rate Change History</div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><th style={G.th}>Date</th><th style={G.th}>Fuel</th><th style={G.th}>Old Rate</th><th style={G.th}>New Rate</th><th style={G.th}>Changed By</th></tr></thead>
        <tbody>
          {[{d:"Today 08:12",f:"Petrol",old:"95.80",nw:"96.72",by:"Owner"},{d:"Feb 18",f:"Diesel",old:"88.90",nw:"89.62",by:"Owner"},{d:"Feb 10",f:"CNG",old:"92.50",nw:"94.00",by:"Admin"}].map((r,i)=><tr key={i}>
            <td style={{...G.td,color:C.muted3}}>{r.d}</td>
            <td style={G.td}><span style={{...G.badge,background:FUEL.colors[r.f]+"18",color:FUEL.colors[r.f]}}>{r.f}</span></td>
            <td style={{...G.td,color:C.muted2}}>₹{r.old}</td>
            <td style={{...G.td,fontWeight:700,color:C.green}}>₹{r.nw}</td>
            <td style={{...G.td,color:C.muted3}}>{r.by}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <button onClick={save} style={{...G.btn,background:C.accent,color:"#000",fontWeight:800,padding:"11px 24px",alignSelf:"flex-start"}}>💾 Save Prices →</button>
  </div>;
};

// ── Tank Indent / Refill Order System
const IndentSystem=({db,setDb,ownerId,flash})=>{
  const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState({pumpId:"",tankId:"",fuel:"Petrol",qty:"",supplier:"",deliveryDate:"",notes:""});
  const myPumps=db.pumps.filter(p=>p.ownerId===ownerId);
  const myTanks=db.tanks.filter(t=>t.ownerId===ownerId);
  const indents=db.indents||[];
  const myIndents=indents.filter(i=>i.ownerId===ownerId);
  const statusColor={Ordered:C.blue,Dispatched:C.warn,Delivered:C.green,Cancelled:C.red};

  const submitIndent=()=>{
    if(!form.pumpId||!form.qty)return;
    const ni={id:"IND-"+Math.floor(1000+Math.random()*9000),ownerId,pumpId:form.pumpId,tankId:form.tankId,fuel:form.fuel,qty:parseFloat(form.qty),supplier:form.supplier||"Primary Supplier",deliveryDate:form.deliveryDate||new Date(Date.now()+86400000).toISOString().slice(0,10),notes:form.notes,status:"Ordered",orderedAt:new Date().toISOString().slice(0,10)};
    setDb(d=>({...d,indents:[...((d.indents)||[]),ni]}));
    flash("✓ Indent placed: "+form.qty+"L "+form.fuel+" for "+myPumps.find(p=>p.id===form.pumpId)?.shortName);
    setForm({pumpId:"",tankId:"",fuel:"Petrol",qty:"",supplier:"",deliveryDate:"",notes:""});
    setShowForm(false);
  };

  return <div style={{display:"flex",flexDirection:"column",gap:15}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>📦 Stock Indent & Refill Orders</div><div style={{fontSize:11,color:C.muted3,marginTop:2}}>Place fuel supply orders, track delivery status</div></div>
      <button onClick={()=>setShowForm(!showForm)} style={{...G.btn,background:C.accent,color:"#000",fontWeight:700}}>+ New Indent</button>
    </div>
    {/* Low stock alerts */}
    {myTanks.filter(t=>t.stock<=t.alertAt).map(t=>{
      const pump=myPumps.find(p=>p.id===t.pumpId);
      return <div key={t.id} style={{background:C.redDim,border:`1px solid rgba(244,63,94,.3)`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>🔴</span><div><div style={{fontWeight:700,fontSize:12,color:C.red}}>Low Stock Alert — {t.fuel} at {pump?.shortName}</div><div style={{fontSize:10,color:C.muted3}}>{t.stock.toLocaleString()}L remaining (threshold: {t.alertAt.toLocaleString()}L)</div></div></div>
        <button onClick={()=>{setForm(f=>({...f,pumpId:t.pumpId,tankId:t.id,fuel:t.fuel,qty:String(t.capacity-t.stock)}));setShowForm(true);}} style={{...G.btn,background:C.red,color:"#fff",padding:"6px 13px",fontSize:10}}>Order Now →</button>
      </div>;
    })}
    {showForm&&<div style={{...G.card,padding:20,borderColor:"rgba(245,166,35,.3)"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:16}}>📋 New Indent Order</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
        <div><label style={G.label}>Pump</label><select value={form.pumpId} onChange={e=>setForm(f=>({...f,pumpId:e.target.value}))} style={{...G.input,cursor:"pointer"}}><option value="">— Select —</option>{myPumps.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}</select></div>
        <div><label style={G.label}>Fuel Type</label><select value={form.fuel} onChange={e=>setForm(f=>({...f,fuel:e.target.value}))} style={{...G.input,cursor:"pointer"}}>{["Petrol","Diesel","CNG"].map(f=><option key={f}>{f}</option>)}</select></div>
        <div><label style={G.label}>Quantity (Litres)</label><input type="number" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} style={G.input} placeholder="5000"/></div>
        <div><label style={G.label}>Supplier Name</label><input value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))} style={G.input} placeholder="Primary Supplier"/></div>
        <div><label style={G.label}>Expected Delivery</label><input type="date" value={form.deliveryDate} onChange={e=>setForm(f=>({...f,deliveryDate:e.target.value}))} style={G.input}/></div>
        <div><label style={G.label}>Notes</label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={G.input} placeholder="Any special instructions"/></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={submitIndent} style={{...G.btn,background:C.accent,color:"#000",fontWeight:700}}>Place Order →</button>
        <button onClick={()=>setShowForm(false)} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`}}>Cancel</button>
      </div>
    </div>}
    {/* Indent list */}
    <div style={G.card}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>📦 Order Tracking</div>
      {myIndents.length===0&&<div style={{padding:24,textAlign:"center",color:C.muted3,fontSize:12}}>No orders yet. Place your first indent above.</div>}
      {myIndents.length>0&&<table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><th style={G.th}>ID</th><th style={G.th}>Pump</th><th style={G.th}>Fuel</th><th style={G.th}>Qty</th><th style={G.th}>Supplier</th><th style={G.th}>Delivery</th><th style={G.th}>Status</th><th style={G.th}>Action</th></tr></thead>
        <tbody>{myIndents.map(i=>{
          const pump=myPumps.find(p=>p.id===i.pumpId);
          return <tr key={i.id}>
            <td style={{...G.td,fontFamily:"monospace",fontSize:10,color:C.muted3}}>{i.id}</td>
            <td style={{...G.td,fontWeight:600}}>{pump?.shortName||i.pumpId}</td>
            <td style={G.td}><span style={{...G.badge,background:FUEL.colors[i.fuel]+"18",color:FUEL.colors[i.fuel]}}>{i.fuel}</span></td>
            <td style={{...G.td,fontWeight:700}}>{i.qty.toLocaleString()}L</td>
            <td style={{...G.td,color:C.muted3}}>{i.supplier}</td>
            <td style={{...G.td,color:C.muted3}}>{i.deliveryDate}</td>
            <td style={G.td}><span style={{...G.badge,background:(statusColor[i.status]||C.muted)+"18",color:statusColor[i.status]||C.muted,border:`1px solid ${(statusColor[i.status]||C.muted)}30`}}>{i.status}</span></td>
            <td style={G.td}><div style={{display:"flex",gap:5}}>
              {i.status==="Ordered"&&<button onClick={()=>{setDb(d=>({...d,indents:(d.indents||[]).map(x=>x.id===i.id?{...x,status:"Dispatched"}:x)}));flash("✓ Marked as Dispatched");}} style={{...G.btn,background:C.warnDim,color:C.warn,border:`1px solid rgba(251,191,36,.3)`,padding:"4px 9px",fontSize:9}}>Dispatch</button>}
              {i.status==="Dispatched"&&<button onClick={()=>{setDb(d=>({...d,indents:(d.indents||[]).map(x=>x.id===i.id?{...x,status:"Delivered"}:x),tanks:d.tanks.map(t=>t.id===i.tankId?{...t,stock:Math.min(t.capacity,t.stock+i.qty)}:t)}));flash("✓ Delivery confirmed: "+i.qty+"L added to tank");}} style={{...G.btn,background:C.greenDim,color:C.green,border:`1px solid rgba(0,229,179,.3)`,padding:"4px 9px",fontSize:9}}>Received ✓</button>}
              {i.status!=="Delivered"&&i.status!=="Cancelled"&&<button onClick={()=>{setDb(d=>({...d,indents:(d.indents||[]).map(x=>x.id===i.id?{...x,status:"Cancelled"}:x)}));}} style={{...G.btn,background:C.redDim,color:C.red,border:`1px solid rgba(244,63,94,.3)`,padding:"4px 9px",fontSize:9}}>✕</button>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>}
    </div>
    {/* Summary stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
      {[["Total Ordered",myIndents.length,"📦",C.blue],["Pending",myIndents.filter(i=>i.status==="Ordered"||i.status==="Dispatched").length,"⏳",C.warn],["Delivered",myIndents.filter(i=>i.status==="Delivered").length,"✅",C.green],["Cancelled",myIndents.filter(i=>i.status==="Cancelled").length,"❌",C.red]].map(([l,v,ic,c])=><Kpi key={l} label={l} value={v} icon={ic} accent={c}/>)}
    </div>
  </div>;
};

// ── Shift Audit / Edit Module
const ShiftAuditPanel=({db,setDb,ownerId,flash})=>{
  const[selectedShift,setSelectedShift]=useState(null);
  const[editF,setEditF]=useState({});
  const[auditReason,setAuditReason]=useState("");
  const myShifts=db.shiftReports.filter(r=>r.ownerId===ownerId).slice(0,20);
  const myPumps=db.pumps.filter(p=>p.ownerId===ownerId);
  const auditLog=db.shiftAuditLog||[];

  const submitEdit=()=>{
    if(!auditReason.trim()){flash("⚠ Audit reason required");return;}
    const log={id:"AL-"+rid(),shiftId:selectedShift.id,ownerId,timestamp:new Date().toISOString(),reason:auditReason,changes:editF,editedBy:"Owner"};
    setDb(d=>({...d,
      shiftReports:d.shiftReports.map(s=>s.id===selectedShift.id?{...s,...editF,status:"Audited"}:s),
      shiftAuditLog:[...(d.shiftAuditLog||[]),log]
    }));
    flash("✓ Shift updated with audit trail logged");
    setSelectedShift(null);setEditF({});setAuditReason("");
  };

  return <div style={{display:"flex",flexDirection:"column",gap:15}}>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>🔍 Shift Audit & Edit</div>
    <div style={{fontSize:11,color:C.muted3,marginBottom:4}}>Edit submitted shift reports with reason logging for compliance</div>
    {selectedShift&&<div style={{...G.card,padding:20,borderColor:"rgba(167,139,250,.4)"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:16,color:C.purple}}>✏️ Editing: {selectedShift.pumpId} · {selectedShift.date} · {selectedShift.shift}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:14}}>
        {[["cash","Cash (₹)"],["card","Card (₹)"],["upi","UPI (₹)"],["variance","Variance (₹)"]].map(([k,l])=><div key={k}>
          <label style={G.label}>{l}</label>
          <input type="number" defaultValue={selectedShift[k]||0} onChange={e=>setEditF(f=>({...f,[k]:parseFloat(e.target.value)||0}))} style={{...G.input,borderColor:editF[k]!==undefined?"rgba(167,139,250,.5)":undefined}}/>
        </div>)}
      </div>
      <div style={{marginBottom:14}}><label style={{...G.label,color:C.purple}}>Audit Reason (required)</label><textarea value={auditReason} onChange={e=>setAuditReason(e.target.value)} placeholder="Explain why this shift is being edited (e.g. cash entry error, denomination correction...)" style={{...G.input,minHeight:80,resize:"vertical"}}/></div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={submitEdit} style={{...G.btn,background:C.purple,color:"#fff",fontWeight:700}}>✓ Save with Audit Trail</button>
        <button onClick={()=>{setSelectedShift(null);setEditF({});setAuditReason("");}} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`}}>Cancel</button>
      </div>
    </div>}
    <div style={G.card}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>Submitted Shifts</div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><th style={G.th}>Date</th><th style={G.th}>Pump</th><th style={G.th}>Shift</th><th style={G.th}>Sales</th><th style={G.th}>Cash</th><th style={G.th}>Variance</th><th style={G.th}>Status</th><th style={G.th}>Edit</th></tr></thead>
        <tbody>{myShifts.map(s=>{
          const pump=myPumps.find(p=>p.id===s.pumpId);
          return <tr key={s.id}>
            <td style={{...G.td,color:C.muted3}}>{s.date}</td>
            <td style={{...G.td,fontWeight:600}}>{pump?.shortName||s.pumpId}</td>
            <td style={G.td}>{s.shift==="Morning"?"🌅":s.shift==="Afternoon"?"☀️":"🌙"} {s.shift}</td>
            <td style={{...G.td,fontWeight:700,color:C.accent}}>₹{(s.totalSales||0).toLocaleString()}</td>
            <td style={G.td}>₹{(s.cash||0).toLocaleString()}</td>
            <td style={{...G.td,color:(s.variance||0)>0?C.red:(s.variance||0)<0?C.green:C.muted3}}>{s.variance>0?"+":""}{s.variance||0}</td>
            <td style={G.td}><Sb s={s.status}/></td>
            <td style={G.td}><button onClick={()=>{setSelectedShift(s);setEditF({});setAuditReason("");}} style={{...G.btn,background:C.purpleDim,color:C.purple,border:`1px solid rgba(167,139,250,.3)`,padding:"4px 10px",fontSize:9}}>✏️ Edit</button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {auditLog.length>0&&<div style={G.card}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>🔍 Audit Log</div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>{auditLog.slice(-10).reverse().map(a=><div key={a.id} style={{padding:"10px 16px",borderBottom:`1px solid rgba(28,37,64,.5)`,fontSize:11}}>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,color:C.purple}}>Shift {a.shiftId?.slice(-6)}</span><span style={{color:C.muted3,fontSize:9}}>{new Date(a.timestamp).toLocaleString()}</span></div>
        <div style={{color:C.muted3,marginTop:2}}>{a.reason}</div>
      </div>)}</div>
    </div>}
  </div>;
};

// ── Notification Centre (Push alerts for owner)
const NotificationCentre=({db,setDb,owner,flash})=>{
  const[filter,setFilter]=useState("all");
  const notifications=[
    ...(db.tanks||[]).filter(t=>t.ownerId===owner.id&&t.stock<=t.alertAt).map(t=>({id:"nt-"+t.id,type:"danger",icon:"🔴",title:"Low Stock Alert",body:`${t.fuel} tank at ${(db.pumps||[]).find(p=>p.id===t.pumpId)?.shortName} — only ${t.stock.toLocaleString()}L remaining`,time:"Just now",read:false})),
    ...((db.machineTests||[]).filter(t=>t.ownerId===owner.id&&(t.result==="Fail"||t.result==="Warning"))).map(t=>({id:"nt-mt-"+t.id,type:t.result==="Fail"?"danger":"warn",icon:t.result==="Fail"?"🔴":"🟡",title:`Machine Test ${t.result}`,body:`Nozzle ${t.nozzleId} at ${(db.pumps||[]).find(p=>p.id===t.pumpId)?.shortName} — ${t.result==="Fail"?"calibration required":"variance high"}`,time:"Today "+t.time,read:false})),
    {id:"nt-plan",type:owner.endDate&&daysDiff(todayS(),owner.endDate)<=7?"warn":"info",icon:"⚡",title:"Plan Renewal Reminder",body:`${owner.plan} plan expires ${owner.endDate} — ${daysDiff(todayS(),owner.endDate)} days remaining`,time:"Today",read:false},
    {id:"nt-shift",type:"info",icon:"🔵",title:"Morning Shift Submitted",body:"Koregaon Park — Vikram Desai · ₹42,140",time:"2 hr ago",read:true},
    {id:"nt-wa",type:"success",icon:"🟢",title:"WhatsApp Delivered",body:"Shift summary sent to +91 98765 43210",time:"3 hr ago",read:true},
    {id:"nt-cc",type:"warn",icon:"🟡",title:"Credit Limit Warning",body:"Patel Trucks — 99% of ₹20,000 limit used",time:"Yesterday",read:true},
  ];
  const filtered=filter==="all"?notifications:notifications.filter(n=>n.type===filter||(!["danger","warn","info","success"].includes(filter)&&n.read===(filter==="read")));
  const typeColor={danger:C.red,warn:C.warn,info:C.blue,success:C.green};

  return <div style={{display:"flex",flexDirection:"column",gap:15}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>🔔 Notification Centre</div><div style={{fontSize:11,color:C.muted3,marginTop:2}}>Alerts for stock, tests, plan renewal, payments & WhatsApp</div></div>
      <div style={{display:"flex",gap:6}}>
        {["all","danger","warn","info"].map(f=><button key={f} onClick={()=>setFilter(f)} style={{...G.btn,background:filter===f?(typeColor[f]||C.accent):C.s2,color:filter===f?(f==="warn"?"#000":"#fff"):C.muted2,border:`1px solid ${filter===f?(typeColor[f]||C.accent):C.border}`,padding:"5px 11px",fontSize:9,textTransform:"capitalize"}}>{f==="all"?"All Alerts":f==="danger"?"🔴 Critical":f==="warn"?"🟡 Warning":"🔵 Info"}</button>)}
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.map(n=><div key={n.id} style={{...G.card,padding:"14px 18px",display:"flex",gap:14,alignItems:"flex-start",borderLeft:`3px solid ${typeColor[n.type]||C.blue}`,opacity:n.read?0.7:1}}>
        <span style={{fontSize:20}}>{n.icon}</span>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
            <span style={{fontWeight:700,fontSize:12,color:typeColor[n.type]||C.text}}>{n.title}</span>
            <span style={{fontSize:9,color:C.muted3}}>{n.time}</span>
          </div>
          <div style={{fontSize:11,color:C.muted3}}>{n.body}</div>
        </div>
        {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:typeColor[n.type]||C.blue,flexShrink:0,marginTop:5}}/>}
      </div>)}
    </div>
    {/* WhatsApp config reminder */}
    {!owner.whatsapp&&<div style={{background:C.greenDim,border:`1px solid rgba(0,229,179,.25)`,borderRadius:10,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontWeight:700,color:C.green,marginBottom:3}}>💬 Enable WhatsApp Alerts</div><div style={{fontSize:10,color:C.muted3}}>Get instant shift reports, stock alerts and payment confirmations on WhatsApp</div></div>
      <button style={{...G.btn,background:C.green,color:"#000",fontWeight:700}}>Enable →</button>
    </div>}
  </div>;
};

// ── PDF Export System — Shift PDF, GST PDF, Analytics PDF
const buildShiftPDF=(shift,readings,pumps)=>{
  const pump=pumps.find(p=>p.id===shift.pumpId)||{name:shift.pumpId,shortName:shift.pumpId,gst:"",address:""};
  const icon=shift.shift==="Morning"?"🌅":shift.shift==="Afternoon"?"☀️":"🌙";
  const rows=(readings||[]).map(r=>`<tr>
    <td>${r.nozzleId}</td><td>${r.fuel}</td>
    <td style="font-family:monospace">${(r.openReading||0).toFixed(2)}</td>
    <td style="font-family:monospace">${(r.closeReading||0).toFixed(2)}</td>
    <td>${((r.closeReading||0)-(r.openReading||0)-(r.testVol||0)).toFixed(2)}L</td>
    <td style="font-weight:700">₹${(r.revenue||0).toLocaleString()}</td>
    <td>${r.operator||"—"}</td>
  </tr>`).join("");
  return `
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:2px solid #111">
    <tr style="background:#f5f5f5"><th colspan="7" style="padding:10px;text-align:left;font-size:14px">${icon} ${shift.shift} Shift — ${shift.date} · ${pump.name}</th></tr>
    <tr style="background:#eee"><td style="padding:7px;font-size:10px">PUMP</td><td colspan="3">${pump.name}</td><td>GST</td><td colspan="2">${pump.gst||"—"}</td></tr>
    <tr style="background:#eee"><td style="padding:7px;font-size:10px">SHIFT</td><td>${shift.shift}</td><td>DATE</td><td>${shift.date}</td><td>MANAGER</td><td colspan="2">${shift.manager||"—"}</td></tr>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
    <thead><tr style="background:#111;color:#fff"><th style="padding:8px;text-align:left">Nozzle</th><th>Fuel</th><th>Open</th><th>Close</th><th>Volume</th><th>Revenue</th><th>Operator</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-val">₹${(shift.totalSales||0).toLocaleString()}</div><div class="kpi-label">Total Sales</div></div>
    <div class="kpi"><div class="kpi-val">₹${(shift.cash||0).toLocaleString()}</div><div class="kpi-label">Cash</div></div>
    <div class="kpi"><div class="kpi-val">₹${(shift.card||0).toLocaleString()}</div><div class="kpi-label">Card</div></div>
    <div class="kpi"><div class="kpi-val">₹${(shift.upi||0).toLocaleString()}</div><div class="kpi-label">UPI</div></div>
  </div>
  <p style="color:${(shift.variance||0)>100?"#c00":(shift.variance||0)<-100?"#060":"#666"};margin-top:8px">
    Variance: ${shift.variance>=0?"+":""}${shift.variance||0} · Status: ${shift.status||"Submitted"}
  </p>`;
};

const buildGSTPDF=(sales,pumps,owner,period)=>{
  const totals={petrol:0,diesel:0,cng:0};
  sales.forEach(s=>{totals.petrol+=s.petrol;totals.diesel+=s.diesel;totals.cng+=s.cng;});
  const rows=["Petrol","Diesel","CNG"].map(f=>{
    const gross=totals[f.toLowerCase()];
    if(!gross)return "";
    const taxable=Math.round(gross/1.18);
    const cgst=Math.round(taxable*.09);
    return `<tr>
      <td>${FUEL.hsn[f]}</td><td>${f}</td>
      <td>₹${taxable.toLocaleString()}</td>
      <td>₹${cgst.toLocaleString()}</td><td>₹${cgst.toLocaleString()}</td>
      <td style="font-weight:700">₹${(cgst*2).toLocaleString()}</td>
      <td style="font-weight:700">₹${gross.toLocaleString()}</td>
    </tr>`;
  }).join("");
  const totalGross=totals.petrol+totals.diesel+totals.cng;
  const totalTaxable=Math.round(totalGross/1.18);
  const totalGST=Math.round(totalTaxable*.18);
  return `
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:2px solid #111">
    <tr style="background:#f5f5f5"><th colspan="4" style="padding:10px;text-align:left">GSTIN</th><td colspan="3" style="padding:10px;font-weight:700">${owner.gst||"Not configured"}</td></tr>
    <tr style="background:#f5f5f5"><th colspan="4" style="padding:8px;text-align:left">Business</th><td colspan="3" style="padding:8px">${owner.name}</td></tr>
    <tr style="background:#f5f5f5"><th colspan="4" style="padding:8px;text-align:left">Period</th><td colspan="3" style="padding:8px">${period}</td></tr>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
    <thead><tr style="background:#111;color:#fff"><th style="padding:8px;text-align:left">HSN</th><th>Fuel</th><th>Taxable Value</th><th>CGST 9%</th><th>SGST 9%</th><th>Total GST</th><th>Gross Revenue</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:#f9f9f9;font-weight:700"><td colspan="2" style="padding:8px">TOTAL</td><td>₹${totalTaxable.toLocaleString()}</td><td>₹${Math.round(totalGST/2).toLocaleString()}</td><td>₹${Math.round(totalGST/2).toLocaleString()}</td><td>₹${totalGST.toLocaleString()}</td><td>₹${totalGross.toLocaleString()}</td></tr></tfoot>
  </table>
  <p style="font-size:11px;color:#777">This report is generated for informational purposes. Please consult your CA for GSTR filing. Data covers ${sales.length} days of sales.</p>`;
};

const PDFExportModal=({type,data,onClose,filename})=>{
  const printContent=()=>{
    const w=window.open("","_blank","width=900,height=700");
    if(!w)return;
    w.document.write(`<!DOCTYPE html><html><head><title>FuelOS — ${type}</title>
    <meta charset="utf-8">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:860px;margin:0 auto;font-size:13px;line-height:1.5}
      h1{font-size:24px;font-weight:900;margin-bottom:6px;letter-spacing:-0.5px}
      h2{font-size:15px;font-weight:700;margin:20px 0 10px;color:#333;border-bottom:1px solid #ddd;padding-bottom:5px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{text-align:left;padding:9px 10px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;border-bottom:2px solid #111;background:#f8f8f8}
      td{padding:9px 10px;border-bottom:1px solid #e8e8e8;font-size:12px}
      tr:nth-child(even) td{background:#fafafa}
      .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:16px 0}
      .kpi{border:1px solid #e0e0e0;border-radius:8px;padding:14px;text-align:center}
      .kpi-val{font-size:20px;font-weight:900;color:#111}
      .kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-top:3px}
      .header-bar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #111}
      .logo{font-size:22px;font-weight:900;letter-spacing:-1px}
      .logo span{color:#f5a623}
      .meta{text-align:right;font-size:11px;color:#777;line-height:1.8}
      .footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#bbb;display:flex;justify-content:space-between}
      @media print{
        body{padding:20px}
        button{display:none}
        .no-print{display:none}
      }
    </style></head><body>
    <div class="header-bar">
      <div><div class="logo">⛽ Fuel<span>OS</span></div><h1>${type}</h1></div>
      <div class="meta">
        <div>Generated: ${new Date().toLocaleString("en-IN")}</div>
        <div>Platform: FuelOS v8</div>
        <div>Report ID: RPT-${Math.random().toString(36).slice(2,10).toUpperCase()}</div>
      </div>
    </div>
    <div class="no-print" style="margin-bottom:20px">
      <button onclick="window.print()" style="padding:10px 22px;background:#111;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:700">🖨️ Print / Save as PDF</button>
      <button onclick="window.close()" style="padding:10px 16px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:13px;cursor:pointer;margin-left:8px">✕ Close</button>
    </div>
    ${data}
    <div class="footer">
      <span>FuelOS v8 · Automated Report · Confidential</span>
      <span>${new Date().toLocaleDateString("en-IN")}</span>
    </div>
    </body></html>`);
    w.document.close();
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(5,6,15,.85)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{...G.card,padding:28,width:440,borderColor:"rgba(75,141,248,.4)"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,marginBottom:4}}>📄 {type}</div>
        <div style={{fontSize:11,color:C.muted3,marginBottom:20}}>A new window will open with print-ready formatting. Use your browser's <strong style={{color:C.text}}>Print → Save as PDF</strong> option.</div>
        <div style={{background:C.s2,borderRadius:9,padding:"12px 14px",marginBottom:18,fontSize:10,color:C.muted3}}>
          <div>✓ Professional header with FuelOS branding</div>
          <div>✓ KPI summary cards</div>
          <div>✓ Full data tables</div>
          <div>✓ Optimized for A4 paper</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={printContent} style={{...G.btn,background:C.blue,color:"#fff",fontWeight:700,flex:1,justifyContent:"center",padding:"11px"}}>🖨️ Open Print Window</button>
          <button onClick={onClose} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`}}>Cancel</button>
        </div>
      </div>
    </div>
  );
};


// ── Advanced Analytics — Full v8 with per-pump, trend, PDF, payment split, volume
const AdvancedAnalytics=({db,ownerId,pumps,activePump,flash})=>{
  const[period,setPeriod]=useState("7d");
  const[pdfModal,setPdfModal]=useState(false);
  const[viewPump,setViewPump]=useState(activePump||null);
  const pumpColors=["#f5a623","#4b8df8","#06b6d4","#a78bfa","#00e5b3","#f43f5e"];
  const myPumps=pumps||db.pumps.filter(p=>p.ownerId===ownerId);

  const allSales=db.sales.filter(s=>s.ownerId===ownerId);
  const sales=viewPump?allSales.filter(s=>s.pumpId===viewPump):allSales;
  const days=period==="7d"?7:period==="30d"?30:90;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
  const cutStr=cutoff.toISOString().slice(0,10);
  const filtSales=sales.filter(s=>s.date>=cutStr);

  const totalRev=filtSales.reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);
  const petrolRev=filtSales.reduce((s,d)=>s+d.petrol,0);
  const dieselRev=filtSales.reduce((s,d)=>s+d.diesel,0);
  const cngRev=filtSales.reduce((s,d)=>s+d.cng,0);
  const totalVol=petrolRev/FUEL.rates.Petrol+dieselRev/FUEL.rates.Diesel+cngRev/FUEL.rates.CNG;

  const pumpRevenue=myPumps.map((p,i)=>{
    const rev=allSales.filter(s=>s.pumpId===p.id&&s.date>=cutStr).reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);
    const vol=allSales.filter(s=>s.pumpId===p.id&&s.date>=cutStr).reduce((s,d)=>s+d.petrol/FUEL.rates.Petrol+d.diesel/FUEL.rates.Diesel+d.cng/FUEL.rates.CNG,0);
    return {...p,rev,vol:Math.round(vol),color:pumpColors[i%pumpColors.length]};
  });
  const totalAllPumps=pumpRevenue.reduce((s,p)=>s+p.rev,0);
  const topPump=pumpRevenue.reduce((a,b)=>a.rev>b.rev?a:b,{rev:0,shortName:"—",name:"—"});

  // Shift-wise breakdown
  const myShifts=db.shiftReports.filter(r=>r.ownerId===ownerId&&(viewPump?r.pumpId===viewPump:true)&&r.date>=cutStr);
  const cashTotal=myShifts.reduce((s,r)=>s+(r.cash||0),0);
  const cardTotal=myShifts.reduce((s,r)=>s+(r.card||0),0);
  const upiTotal=myShifts.reduce((s,r)=>s+(r.upi||0),0);
  const cashUpi=cashTotal+cardTotal+upiTotal||1;

  // Shift performance (morning vs afternoon vs night)
  const byShift=["Morning","Afternoon","Night"].map(sh=>{
    const rs=myShifts.filter(r=>r.shift===sh);
    return {shift:sh,rev:rs.reduce((s,r)=>s+r.totalSales,0),count:rs.length,icon:sh==="Morning"?"🌅":sh==="Afternoon"?"☀️":"🌙",color:sh==="Morning"?C.accent:sh==="Afternoon"?C.blue:C.purple};
  });

  const pdfHtml=`<div class="kpi-grid">
    <div class="kpi"><div class="kpi-val">₹${(totalRev/100000).toFixed(2)}L</div><div class="kpi-label">Revenue (${period})</div></div>
    <div class="kpi"><div class="kpi-val">${Math.round(totalVol).toLocaleString()}L</div><div class="kpi-label">Volume Sold</div></div>
    <div class="kpi"><div class="kpi-val">${myPumps.length}</div><div class="kpi-label">Pumps</div></div>
    <div class="kpi"><div class="kpi-val">${topPump.shortName}</div><div class="kpi-label">Top Pump</div></div>
  </div>
  <h2>Pump Performance</h2>
  <table><thead><tr><th>Pump</th><th>Revenue</th><th>Volume</th><th>Share %</th></tr></thead><tbody>
  ${pumpRevenue.map(p=>`<tr><td>${p.name}</td><td>₹${p.rev.toLocaleString()}</td><td>${p.vol.toLocaleString()}L</td><td>${totalAllPumps?Math.round(p.rev/totalAllPumps*100):0}%</td></tr>`).join("")}
  </tbody></table>
  <h2>Shift-wise Breakdown</h2>
  <table><thead><tr><th>Shift</th><th>Total Sales</th><th>Shifts Filed</th><th>Avg/Shift</th></tr></thead><tbody>
  ${byShift.map(s=>`<tr><td>${s.shift}</td><td>₹${s.rev.toLocaleString()}</td><td>${s.count}</td><td>₹${s.count?Math.round(s.rev/s.count).toLocaleString():0}</td></tr>`).join("")}
  </tbody></table>
  <h2>Payment Mix</h2>
  <table><thead><tr><th>Method</th><th>Amount</th><th>Share</th></tr></thead><tbody>
  <tr><td>Cash</td><td>₹${cashTotal.toLocaleString()}</td><td>${Math.round(cashTotal/cashUpi*100)}%</td></tr>
  <tr><td>Card</td><td>₹${cardTotal.toLocaleString()}</td><td>${Math.round(cardTotal/cashUpi*100)}%</td></tr>
  <tr><td>UPI</td><td>₹${upiTotal.toLocaleString()}</td><td>${Math.round(upiTotal/cashUpi*100)}%</td></tr>
  </tbody></table>`;

  return <div style={{display:"flex",flexDirection:"column",gap:15}}>
    {pdfModal&&<PDFExportModal type={`Analytics — ${period} Report`} data={pdfHtml} onClose={()=>setPdfModal(false)}/>}
    {/* Toolbar */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>📈 Advanced Analytics</div>
        <div style={{fontSize:11,color:C.muted3,marginTop:2}}>Revenue trends · pump performance · shift analysis · payment mix</div>
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {["7d","30d","90d"].map(p=><button key={p} onClick={()=>setPeriod(p)} style={{...G.btn,background:period===p?C.accent:C.s2,color:period===p?"#000":C.muted2,border:`1px solid ${period===p?C.accent:C.border}`,padding:"5px 12px",fontSize:10}}>{p}</button>)}
        <button onClick={()=>setPdfModal(true)} style={{...G.btn,background:C.blue,color:"#fff",padding:"5px 13px",fontSize:10}}>📄 PDF</button>
      </div>
    </div>
    {/* Pump filter pills */}
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      <div onClick={()=>setViewPump(null)} style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",border:`1px solid ${viewPump===null?C.accent:C.border}`,background:viewPump===null?C.accentDim:"transparent",color:viewPump===null?C.accent:C.muted3,fontSize:10,fontWeight:700}}>All Pumps</div>
      {myPumps.map((p,i)=><div key={p.id} onClick={()=>setViewPump(p.id)} style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",border:`1px solid ${viewPump===p.id?pumpColors[i]:C.border}`,background:viewPump===p.id?pumpColors[i]+"18":"transparent",color:viewPump===p.id?pumpColors[i]:C.muted3,fontSize:10,fontWeight:700}}>⛽ {p.shortName}</div>)}
    </div>
    {/* KPIs */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
      <Kpi label={`Revenue (${period})`} value={fmtL(totalRev)} sub={viewPump?myPumps.find(p=>p.id===viewPump)?.shortName:"All pumps"} accent={C.accent} icon="💰"/>
      <Kpi label="Volume Sold" value={Math.round(totalVol).toLocaleString()+"L"} sub="Petrol+Diesel+CNG" accent={C.blue} icon="⛽"/>
      <Kpi label="Top Pump" value={topPump.shortName} sub={fmtL(topPump.rev)} accent={C.green} icon="🏆"/>
      <Kpi label="Avg/Day" value={fmtL(Math.round(totalRev/days))} sub={`${myShifts.length} shifts`} accent={C.purple} icon="📊"/>
    </div>
    {/* Main charts row */}
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
      <div style={{...G.card,padding:18}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:3}}>📊 Daily Revenue — Petrol · Diesel · CNG</div>
        <div style={{fontSize:9,color:C.muted3,marginBottom:14}}>Stacked bar · hover for values</div>
        <BarChart data={filtSales.map(d=>({label:d.date.slice(5),petrol:d.petrol,diesel:d.diesel,cng:d.cng}))} keys={["petrol","diesel","cng"]} colors={[C.blue,C.accent,C.green]} h={140}/>
        <div style={{display:"flex",gap:16,marginTop:10}}>
          {[["Petrol",C.blue,petrolRev],["Diesel",C.accent,dieselRev],["CNG",C.green,cngRev]].map(([l,c,v])=><div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
            <div style={{width:8,height:8,borderRadius:2,background:c}}/><span style={{color:C.muted3}}>{l}</span><span style={{fontWeight:700,color:c}}>{fmtL(v)}</span>
          </div>)}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{...G.card,padding:16}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,marginBottom:8}}>⛽ Pump Revenue Share</div>
          <Donut segs={pumpRevenue.map(p=>({v:p.rev,c:p.color}))} size={80}/>
          <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
            {pumpRevenue.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:p.color}}/><span style={{color:C.muted3}}>{p.shortName}</span></div>
              <span style={{fontWeight:700,color:p.color}}>{totalAllPumps?Math.round(p.rev/totalAllPumps*100):0}%</span>
            </div>)}
          </div>
        </div>
        <div style={{...G.card,padding:16}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,marginBottom:8}}>💳 Payment Mix</div>
          <Donut segs={[{v:cashTotal,c:C.accent},{v:cardTotal,c:C.blue},{v:upiTotal,c:C.green}]} size={80}/>
          <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
            {[["Cash",cashTotal,C.accent],["Card",cardTotal,C.blue],["UPI",upiTotal,C.green]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:10}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:c}}/><span style={{color:C.muted3}}>{l}</span></div><span style={{fontWeight:700,color:c}}>{Math.round(v/cashUpi*100)}%</span></div>)}
          </div>
        </div>
      </div>
    </div>
    {/* Shift performance */}
    <div style={{...G.card,overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>🕐 Shift-wise Performance</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0}}>
        {byShift.map((s,i)=><div key={s.shift} style={{padding:16,borderRight:i<2?`1px solid ${C.border}`:undefined}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
            <span style={{fontSize:18}}>{s.icon}</span>
            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:s.color}}>{s.shift}</span>
          </div>
          <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:2}}>{fmtL(s.rev)}</div>
          <div style={{fontSize:9,color:C.muted3,marginBottom:8}}>{s.count} shifts · avg {s.count?fmtL(Math.round(s.rev/s.count)):"—"}</div>
          <div style={{height:4,background:C.s3,borderRadius:2}}><div style={{height:"100%",width:byShift.reduce((a,b)=>a.rev>b.rev?a:b,{rev:1}).rev>0?(s.rev/byShift.reduce((a,b)=>a.rev>b.rev?a:b,{rev:1}).rev*100)+"%":"0%",background:s.color,borderRadius:2}}/></div>
        </div>)}
      </div>
    </div>
    {/* Pump performance table */}
    <div style={G.card}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>⛽ Pump Performance Table</div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><th style={G.th}>Pump</th><th style={G.th}>Revenue</th><th style={G.th}>Volume (L)</th><th style={G.th}>Avg/Day</th><th style={G.th}>Share</th><th style={G.th}>Trend</th></tr></thead>
        <tbody>{pumpRevenue.map(p=>{
          const share=totalAllPumps?Math.round(p.rev/totalAllPumps*100):0;
          const avgDay=Math.round(p.rev/days);
          const trend=Math.round((Math.random()-.3)*20+5);
          return <tr key={p.id}>
            <td style={{...G.td,fontWeight:700}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:24,borderRadius:2,background:p.color}}/>{p.shortName}</div></td>
            <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmtL(p.rev)}</td>
            <td style={{...G.td,color:C.muted3}}>{p.vol.toLocaleString()}L</td>
            <td style={{...G.td,color:C.muted2}}>{fmtL(avgDay)}</td>
            <td style={G.td}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{flex:1,height:4,background:C.s3,borderRadius:2,minWidth:60}}><div style={{height:"100%",width:share+"%",background:p.color,borderRadius:2}}/></div><span style={{fontSize:9,color:p.color,fontWeight:700,minWidth:24}}>{share}%</span></div></td>
            <td style={{...G.td,fontWeight:700,color:trend>=0?C.green:C.red,fontSize:13}}>{trend>=0?"↑":"↓"}{Math.abs(trend)}%</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
};


// ── Razorpay v8 — Full order→verify flow with method selection + animations
const RazorpayGateway=({owner,plan,billing,amount,base,gst,discount,txnId,onSuccess,onCancel})=>{
  const[step,setStep]=useState("review");
  const[method,setMethod]=useState("upi");
  const[upiId,setUpiId]=useState("");
  const[cardNo,setCardNo]=useState("");
  const[cardExp,setCardExp]=useState("");
  const[cardCvv,setCardCvv]=useState("");
  const[bank,setBank]=useState("SBI");
  const[dots,setDots]=useState(".");
  useEffect(()=>{
    if(step!=="processing")return;
    const iv=setInterval(()=>setDots(d=>d.length>=3?".":"d.".repeat(d.length+1))  ,400);
    return ()=>clearInterval(iv);
  },[step]);
  const simulate=()=>{
    if(method==="upi"&&!upiId.includes("@")){alert("Enter valid UPI ID e.g. name@upi");return;}
    setStep("processing");
    setTimeout(()=>{
      const ok=Math.random()>.12;
      setStep(ok?"success":"failed");
      if(ok)setTimeout(()=>onSuccess({txnId,plan,billing,amount,base,gst,credit:discount||0,method,razorpay_payment_id:"pay_"+rid().slice(0,16)}),1400);
    },2800);
  };
  const planDef=PLANS[plan]||PLANS.Starter;

  if(step==="processing")return(
    <div style={{...G.card,padding:52,textAlign:"center",background:C.s1,borderColor:C.border2}}>
      <div style={{width:56,height:56,borderRadius:"50%",border:`3px solid ${C.border}`,borderTopColor:C.blue,animation:"spin 0.9s linear infinite",margin:"0 auto 20px"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,marginBottom:8}}>Processing{dots}</div>
      <div style={{fontSize:11,color:C.muted3}}>Verifying with Razorpay · Do not refresh</div>
      <div style={{marginTop:16,fontSize:10,color:C.muted,background:C.s2,borderRadius:8,padding:"8px 14px",display:"inline-block"}}>TXN: {txnId}</div>
    </div>
  );
  if(step==="success")return(
    <div style={{...G.card,padding:52,textAlign:"center",borderColor:"rgba(0,229,179,.4)",background:"rgba(0,229,179,.04)"}}>
      <div style={{fontSize:52,marginBottom:14}}>✅</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:C.green,marginBottom:6}}>Payment Successful!</div>
      <div style={{fontSize:12,color:C.muted3,marginBottom:4}}>{planDef.icon} {plan} plan activated</div>
      <div style={{fontSize:11,color:C.muted3}}>Valid for {billing==="yearly"?"365 days":"30 days"} · WhatsApp confirmation sent</div>
      <div style={{marginTop:16,fontSize:10,color:C.muted3,background:C.s2,borderRadius:8,padding:"8px 14px",display:"inline-flex",gap:12}}>
        <span>TXN: {txnId}</span><span>·</span><span>₹{amount.toLocaleString()} charged</span><span>·</span><span style={{color:C.green}}>{method.toUpperCase()}</span>
      </div>
    </div>
  );
  if(step==="failed")return(
    <div style={{...G.card,padding:52,textAlign:"center",borderColor:"rgba(244,63,94,.4)",background:"rgba(244,63,94,.04)"}}>
      <div style={{fontSize:52,marginBottom:14}}>❌</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:C.red,marginBottom:6}}>Payment Failed</div>
      <div style={{fontSize:11,color:C.muted3,marginBottom:24}}>Your bank declined the transaction. No amount was charged.</div>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <button onClick={()=>setStep("review")} style={{...G.btn,background:C.accent,color:"#000",fontWeight:700}}>Try Again →</button>
        <button onClick={onCancel} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`}}>Cancel</button>
      </div>
    </div>
  );

  return(
    <div style={{...G.card,padding:24,borderColor:"rgba(75,141,248,.35)",background:"rgba(75,141,248,.03)"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18}}>💳 Complete Your Payment</div><div style={{fontSize:10,color:C.muted3,marginTop:2}}>Powered by Razorpay · PCI-DSS Compliant</div></div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:9,color:C.green,background:"rgba(0,229,179,.08)",border:"1px solid rgba(0,229,179,.2)",padding:"5px 10px",borderRadius:7}}>🔒 256-bit SSL</div>
      </div>
      {/* Order summary */}
      <div style={{background:C.s2,borderRadius:10,padding:"14px 16px",marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,color:C.muted3}}>Plan</div>
          <div style={{fontWeight:700,color:planDef.color||C.accent}}>{planDef.icon} {plan} ({billing})</div>
        </div>
        {discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6,color:C.green}}><span>Coupon Discount</span><span>-₹{discount.toLocaleString()}</span></div>}
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted3,marginBottom:4}}><span>Base amount</span><span>₹{base.toLocaleString()}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted3,marginBottom:10}}><span>GST 18%</span><span>₹{gst.toLocaleString()}</span></div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15}}>Total</span>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:C.accent}}>₹{amount.toLocaleString()}</span>
        </div>
      </div>
      {/* Payment method */}
      <div style={{marginBottom:16}}>
        <label style={G.label}>Payment Method</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[["upi","📱","UPI"],["card","💳","Card"],["netbanking","🏦","NetBanking"]].map(([m,ic,l])=>(
            <div key={m} onClick={()=>setMethod(m)} style={{padding:"10px 12px",borderRadius:9,border:`1px solid ${method===m?C.blue:C.border}`,background:method===m?"rgba(75,141,248,.1)":C.s2,cursor:"pointer",textAlign:"center",fontSize:11,fontWeight:700,color:method===m?C.blue:C.muted2,transition:"all .15s"}}>
              <div style={{fontSize:16,marginBottom:3}}>{ic}</div>{l}
            </div>
          ))}
        </div>
        {method==="upi"&&<div>
          <label style={G.label}>UPI ID</label>
          <input value={upiId} onChange={e=>setUpiId(e.target.value)} style={G.input} placeholder="yourname@upi or phone@paytm" onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
          <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
            {["@paytm","@googlepay","@phonepe","@ybl"].map(s=><div key={s} onClick={()=>setUpiId("9876543210"+s)} style={{fontSize:9,padding:"3px 8px",borderRadius:5,background:C.s2,border:`1px solid ${C.border}`,color:C.muted3,cursor:"pointer"}}>{s}</div>)}
          </div>
        </div>}
        {method==="card"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{gridColumn:"1/-1"}}><label style={G.label}>Card Number</label><input maxLength="19" value={cardNo} onChange={e=>setCardNo(e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim())} style={{...G.input,letterSpacing:2}} placeholder="4242 4242 4242 4242"/></div>
          <div><label style={G.label}>Expiry</label><input style={G.input} value={cardExp} onChange={e=>setCardExp(e.target.value.replace(/[^0-9/]/g,""))} placeholder="MM/YY" maxLength="5"/></div>
          <div><label style={G.label}>CVV</label><input type="password" value={cardCvv} onChange={e=>setCardCvv(e.target.value.slice(0,4))} style={G.input} placeholder="•••"/></div>
          <div style={{gridColumn:"1/-1",fontSize:9,color:C.muted3,display:"flex",gap:8,alignItems:"center"}}>
            <span>💳 Visa</span><span>💳 Mastercard</span><span>💳 RuPay</span><span>💳 Amex</span>
          </div>
        </div>}
        {method==="netbanking"&&<div>
          <label style={G.label}>Select Your Bank</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[["SBI","🏦"],["HDFC","🏦"],["ICICI","🏦"],["Axis","🏦"],["Kotak","🏦"],["Other","🏦"]].map(([b,ic])=>(
              <div key={b} onClick={()=>setBank(b)} style={{padding:"10px",borderRadius:8,border:`1px solid ${bank===b?C.blue:C.border}`,background:bank===b?"rgba(75,141,248,.1)":C.s2,cursor:"pointer",textAlign:"center",fontSize:11,fontWeight:700,color:bank===b?C.blue:C.muted3}}>{b}</div>
            ))}
          </div>
        </div>}
      </div>
      {/* Pay button */}
      <button onClick={simulate} style={{...G.btn,background:`linear-gradient(135deg,${C.blue},#6366f1)`,color:"#fff",fontWeight:800,width:"100%",justifyContent:"center",padding:"14px",fontSize:13,borderRadius:11,boxShadow:`0 8px 24px rgba(75,141,248,.35)`}}>
        🔒 Pay ₹{amount.toLocaleString()} Securely →
      </button>
      <div style={{marginTop:10,fontSize:9,color:C.muted,textAlign:"center"}}>TXN: {txnId} · Demo mode — no real charges</div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════
// OWNER DASHBOARD — Multi-Pump with Consolidated View
// ═══════════════════════════════════════════════════════════
const OwnerDash=({owner,setOwner,db,setDb,onLogout})=>{
  const[tab,setTab]=useState("overview");
  const[activePump,setActivePump]=useState(null); // null = consolidated view
  const[gw,setGw]=useState(null);
  const[rzpOrder,setRzpOrder]=useState(null); // {plan,billing,amount,base,gst,txnId}
  const[showTestForm,setShowTestForm]=useState(false);
  const[billing,setBilling]=useState("monthly");
  const[notifs,setNotifs]=useState((db.notifications||[]).filter(n=>n.ownerId===owner.id));
  const[msg,setMsg]=useState("");
  const[showAddPump,setShowAddPump]=useState(false);
  const[pumpF,setPumpF]=useState({name:"",shortName:"",city:"",state:"",address:"",gst:""});
  const[collectState,setCollectState]=useState({});
  const[mgrF,setMgrF]=useState({name:"",email:"",phone:"",password:"",shift:"Morning",pumpId:"",salary:""});
  const[opF,setOpF]=useState({name:"",email:"",phone:"",password:"",shift:"Morning",pumpId:"",nozzles:"",salary:""});
  const[ccF,setCcF]=useState({name:"",phone:"",limit:"",pumpId:""});
  const[dipF,setDipF]=useState({});
  const[waF,setWaF]=useState({enabled:owner.whatsapp||false,number:owner.whatsappNum||""});
  const[passF,setPassF]=useState({old:"",n1:"",n2:""});
  const[showAM,setShowAM]=useState(false);
  const[showAO,setShowAO]=useState(false);
  const[showACC,setShowACC]=useState(false);
  const[showAN,setShowAN]=useState(false);
  const[filterPumpReport,setFilterPumpReport]=useState("all");
  const[filterDateReport,setFilterDateReport]=useState("");

  const flash=t=>{setMsg(t);setTimeout(()=>setMsg(""),4000);};

  // DATA — scoped to this owner
  const myPumps=useMemo(()=>db.pumps.filter(p=>p.ownerId===owner.id),[db.pumps,owner.id]);
  const myNozzles=useMemo(()=>db.nozzles.filter(n=>n.ownerId===owner.id),[db.nozzles,owner.id]);
  const myMgr=useMemo(()=>db.managers.filter(m=>m.ownerId===owner.id),[db.managers,owner.id]);
  const myOp=useMemo(()=>db.operators.filter(o=>o.ownerId===owner.id),[db.operators,owner.id]);
  const myTanks=useMemo(()=>db.tanks.filter(t=>t.ownerId===owner.id),[db.tanks,owner.id]);
  const myCC=useMemo(()=>db.creditCustomers.filter(c=>c.ownerId===owner.id),[db.creditCustomers,owner.id]);
  const myShifts=useMemo(()=>db.shiftReports.filter(r=>r.ownerId===owner.id),[db.shiftReports,owner.id]);
  const myTests=useMemo(()=>(db.machineTests||[]).filter(t=>t.ownerId===owner.id),[db.machineTests,owner.id]);
  const mySales=useMemo(()=>db.sales.filter(s=>s.ownerId===owner.id),[db.sales,owner.id]);
  const myTxn=useMemo(()=>db.transactions.filter(t=>t.ownerId===owner.id),[db.transactions,owner.id]);

  // Active pump or consolidated
  const viewPumps=activePump?[activePump]:myPumps.map(p=>p.id);
  const pumpNozzles=useMemo(()=>myNozzles.filter(n=>viewPumps.includes(n.pumpId)),[myNozzles,viewPumps]);
  const pumpSales=useMemo(()=>aggregateSales(mySales,viewPumps),[mySales,viewPumps]);
  const pumpShifts=useMemo(()=>myShifts.filter(r=>viewPumps.includes(r.pumpId)),[myShifts,viewPumps]);
  const pumpTanks=useMemo(()=>myTanks.filter(t=>viewPumps.includes(t.pumpId)),[myTanks,viewPumps]);
  const pumpTests=useMemo(()=>myTests.filter(t=>viewPumps.includes(t.pumpId)),[myTests,viewPumps]);
  const todayTests=useMemo(()=>pumpTests.filter(t=>t.date===todayS()),[pumpTests]);

  // Analytics
  const totalWeekRev=pumpSales.reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);
  const testExcludeRev=myTests.reduce((s,t)=>s+t.qty*(FUEL.rates[t.fuel]||0),0);
  const netWeekRev=totalWeekRev-Math.round(testExcludeRev);
  const lowStock=myTanks.filter(t=>t.stock<=t.alertAt);
  const totalOutstanding=myCC.reduce((s,c)=>s+c.outstanding,0);
  const failTests=myTests.filter(t=>t.result==="Fail"||t.result==="Warning");
  const pendingTestCount=myNozzles.filter(n=>getNozzleTestStatus(myTests,n.id,n.pumpId,todayS())==="pending").length;

  // Plan limits
  const pd=PLANS[owner.plan]||PLANS.Starter;
  const daysLeft=owner.endDate?daysDiff(todayS(),owner.endDate):0;
  const pumpLimit=checkLimit(owner,db,"pumps");
  const nozzleLimit=checkLimit(owner,db,"nozzles");

  // Pump colors for visual differentiation
  const pumpColors=[C.accent,C.blue,C.teal,C.green,C.purple,C.warn];
  const myPumpsColored=myPumps.map((p,i)=>({...p,_color:pumpColors[i%pumpColors.length]}));


  // Pump & nozzle management state
  const[editPump,setEditPump]=useState(null);  // pumpId being edited
  const[editPumpF,setEditPumpF]=useState({});   // edit form values
  const[expandedPump,setExpandedPump]=useState(null); // which pump card is expanded
  const[showAddNozzle,setShowAddNozzle]=useState(null); // pumpId to add nozzle to
  const[nozzleF,setNozzleF]=useState({id:"",fuel:"Petrol",openReading:"",operator:"",status:"Active"});

  const paySuccess=info=>{
    const txn={id:`TXN-${Math.floor(9000+Math.random()*999)}`,ownerId:owner.id,plan:info.plan,billing:info.billing,amount:info.amount,base:info.base,gst:info.gst,credit:info.credit,date:todayS(),method:info.method,status:"Success",razorId:info.txnId};
    const upd={...owner,plan:info.plan,billing:info.billing,amountPaid:info.base,status:"Active",startDate:todayS(),endDate:addMo(todayS(),info.billing==="monthly"?1:12),daysUsed:0};
    setDb(d=>({...d,transactions:[txn,...d.transactions],owners:d.owners.map(o=>o.id===owner.id?upd:o)}));
    setOwner(upd);setGw(null);flash("✓ "+info.plan+" plan activated!");setTab("billing");
  };

  const addPump=()=>{
    if(!pumpLimit.ok){flash("⚠ Plan limit reached — upgrade to add more pumps");return;}
    if(!pumpF.name||!pumpF.shortName||!pumpF.city){flash("⚠ Fill all required fields");return;}
    const np={id:"P"+rid(),ownerId:owner.id,...pumpF,status:"Active"};
    setDb(d=>({...d,pumps:[...d.pumps,np]}));
    flash("✓ Pump added: "+pumpF.name);setShowAddPump(false);setPumpF({name:"",shortName:"",city:"",state:"",address:"",gst:""});
  };


  const startEditPump=(pump)=>{
    setEditPump(pump.id);
    setEditPumpF({name:pump.name,shortName:pump.shortName,city:pump.city,state:pump.state,address:pump.address||"",gst:pump.gst||""});
  };
  const saveEditPump=()=>{
    if(!editPumpF.name||!editPumpF.shortName){flash("⚠ Name and short name required");return;}
    setDb(d=>({...d,pumps:d.pumps.map(p=>p.id===editPump?{...p,...editPumpF}:p)}));
    flash("✓ Pump updated");setEditPump(null);
  };
  const togglePumpStatus=(pumpId)=>{
    setDb(d=>({...d,pumps:d.pumps.map(p=>p.id===pumpId?{...p,status:p.status==="Active"?"Inactive":"Active"}:p)}));
    flash("Pump status updated");
  };
  const addNozzle=(pumpId)=>{
    const nozzleCheck=checkLimit(owner,db,"nozzles");
    if(!nozzleCheck.ok){flash("⚠ Nozzle limit reached — upgrade plan");return;}
    if(!nozzleF.id||!nozzleF.openReading){flash("⚠ Nozzle ID and opening reading are required");return;}
    // Check duplicate ID for this pump
    if(db.nozzles.some(n=>n.id===nozzleF.id&&n.pumpId===pumpId)){flash("⚠ Nozzle ID already exists on this pump");return;}
    const nn={id:nozzleF.id,ownerId:owner.id,pumpId,fuel:nozzleF.fuel,
      open:parseFloat(nozzleF.openReading),close:"",operator:nozzleF.operator||"",status:nozzleF.status};
    setDb(d=>({...d,nozzles:[...d.nozzles,nn]}));
    flash("✓ Nozzle "+nozzleF.id+" added to pump");
    setNozzleF({id:"",fuel:"Petrol",openReading:"",operator:"",status:"Active"});
    setShowAddNozzle(null);
  };
  const removeNozzle=(nozzleId,pumpId)=>{
    setDb(d=>({...d,nozzles:d.nozzles.filter(n=>!(n.id===nozzleId&&n.pumpId===pumpId))}));
    flash("Nozzle removed");
  };
  const updateNozzleReading=(nozzleId,pumpId,reading)=>{
    setDb(d=>({...d,nozzles:d.nozzles.map(n=>n.id===nozzleId&&n.pumpId===pumpId?{...n,open:parseFloat(reading)}:n)}));
    flash("✓ Current reading updated");
  };

  const NAV=[
    {k:"overview",icon:"📊",label:"Overview"},
    {k:"consolidated",icon:"🏗",label:"Consolidated"},
    {k:"analytics",icon:"📈",label:"Analytics"},
    {k:"pumps",icon:"⛽",label:"My Pumps",badge:myPumps.length,bc:C.blue},
    {k:"testing",icon:"🔬",label:"Machine Tests",badge:(failTests.length>0?"⚠":pendingTestCount>0?pendingTestCount:undefined),bc:failTests.length>0?C.red:C.warn},
    {k:"tanks",icon:"🛢",label:"Stock &amp; Tanks",badge:lowStock.length||undefined,bc:C.red},
    {div:true,k:"d1"},
    {k:"plans",icon:"💳",label:"Plans &amp; Limits",badge:daysLeft>0&&daysLeft<=7?"!":undefined,bc:C.warn},
    {k:"billing",icon:"📜",label:"Billing"},
    {k:"credits",icon:"🤝",label:"Credits"},
    {div:true,k:"d2"},
    {k:"staff",icon:"👥",label:"Staff"},
    {k:"shifts",icon:"📋",label:"Shift Reports"},
    {k:"audit",icon:"🔍",label:"Shift Audit"},
    {div:true,k:"d3"},
    {k:"prices",icon:"💱",label:"Fuel Prices"},
    {k:"indent",icon:"📦",label:"Indent Orders"},
    {k:"gst",icon:"🧾",label:"GST Reports"},
    {k:"notifications",icon:"🔔",label:"Notifications"},
    {k:"settings",icon:"⚙️",label:"Settings"},
  ];

  // ── PUMP SELECTOR BAR (shown at top when multi-pump)
  const PumpBar=()=>myPumps.length>1?<div style={{padding:"10px 20px",background:C.s2,borderBottom:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <span style={{fontSize:9,color:C.muted2,textTransform:"uppercase",letterSpacing:1.5,marginRight:4}}>View:</span>
    <div onClick={()=>setActivePump(null)} style={{padding:"5px 12px",borderRadius:8,cursor:"pointer",border:`1px solid ${activePump===null?C.accent:C.border}`,background:activePump===null?C.accentDim:"transparent",color:activePump===null?C.accent:C.muted3,fontSize:9,fontWeight:700,transition:"all .14s"}}>🏗 All Pumps</div>
    {myPumpsColored.map(p=><PumpPill key={p.id} pump={p} active={activePump===p.id} onClick={()=>setActivePump(p.id)} compact/>)}
  </div>:null;

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Mono',monospace",color:C.text}}>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    {gw&&<Gateway plan={gw.plan} billing={gw.billing} owner={owner} onClose={()=>setGw(null)} onSuccess={paySuccess}/>}
    {showTestForm&&<MachineTestForm nozzles={activePump?pumpNozzles:myNozzles} operators={[...myMgr,...myOp]} pumpId={activePump} ownerId={owner.id} db={db} setDb={setDb} onClose={()=>setShowTestForm(false)} flash={flash}/>}
    <Topbar icon="👤" ac={C.accent} label="Owner Portal" pump={activePump?myPumpsColored.find(p=>p.id===activePump)?.shortName:"Multi-Pump"} db={db} notifs={notifs} onMarkAll={()=>setNotifs(p=>p.map(n=>({...n,read:true})))}
      right={<div style={{display:"flex",gap:8,alignItems:"center"}}>
        {msg&&<div style={{fontSize:11,color:C.green,background:"rgba(0,229,179,.08)",border:"1px solid rgba(0,229,179,.2)",borderRadius:7,padding:"5px 11px"}}>{msg}</div>}
        <div style={{textAlign:"right",marginRight:4}}><div style={{fontSize:11,fontWeight:700,color:pd.color}}>{owner.plan}</div><div style={{fontSize:9,color:C.muted3}}>{daysLeft}d left</div></div>
        <button onClick={onLogout} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"6px 12px"}}>Logout</button>
      </div>}
    />
    <PumpBar/>
    <div style={{display:"flex"}}>
      <Sidebar items={NAV} active={tab} onNav={setTab} accent={C.accent}
        footer={<div style={{padding:"13px 15px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
            <div style={{width:32,height:32,background:pd.color,borderRadius:8,display:"grid",placeItems:"center",fontWeight:800,color:"#000",fontSize:13}}>{pd.icon}</div>
            <div><div style={{fontSize:11,fontWeight:700,color:pd.color}}>{owner.plan}</div><div style={{fontSize:9,color:C.muted3}}>{myPumps.length}/{pd.pumps>=999?"∞":pd.pumps} pumps</div></div>
          </div>
          <LimitBar label="Pumps" used={myPumps.length} max={pd.pumps} color={pd.color}/>
          <LimitBar label="Nozzles" used={myNozzles.length} max={pd.nozzles} color={pd.color}/>
          <LimitBar label="Staff" used={myMgr.length+myOp.length} max={pd.staff} color={pd.color}/>
        </div>}
      />
      <div style={{flex:1,padding:20,overflowY:"auto",maxHeight:"calc(100vh - 62px)"}}>

        {/* ── OVERVIEW TAB ── */}
        {tab==="overview"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>Good day, {owner.name.split(" ")[0]} 👋</div><div style={{fontSize:11,color:C.muted3,marginTop:2}}>{owner.city}, {owner.state} · {myPumps.length} pump{myPumps.length!==1?"s":""} · {myNozzles.length} nozzles</div></div>
          {lowStock.map(t=><div key={t.id} style={{background:C.redDim,border:`1px solid rgba(244,63,94,.2)`,borderRadius:11,padding:"10px 15px",display:"flex",alignItems:"center",gap:11}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div style={{flex:1}}><div style={{fontWeight:700,color:C.red,fontSize:12}}>{t.fuel} Tank Critical at {myPumpsColored.find(p=>p.id===t.pumpId)?.shortName} — {fmtN(t.stock)}L remaining</div><div style={{fontSize:11,color:C.muted3}}>Alert threshold: {fmtN(t.alertAt)}L</div></div>
            <button onClick={()=>setTab("tanks")} style={{...G.btn,background:C.red,color:"#fff",padding:"5px 13px",fontWeight:700}}>View →</button>
          </div>)}
          {pendingTestCount>0&&<div style={{background:C.tealDim,border:"1px solid rgba(6,182,212,.25)",borderRadius:11,padding:"10px 15px",display:"flex",alignItems:"center",gap:11}}>
            <span style={{fontSize:20}}>🔬</span>
            <div style={{flex:1}}><div style={{fontWeight:700,color:C.teal,fontSize:12}}>Daily Machine Tests Pending — {pendingTestCount} nozzle(s)</div><div style={{fontSize:11,color:C.muted3}}>Complete before starting sales</div></div>
            <button onClick={()=>setTab("testing")} style={{...G.btn,background:C.teal,color:"#000",padding:"5px 13px",fontWeight:700}}>Run Tests →</button>
          </div>}
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            <Kpi label="Weekly Net Sales" value={fmtL(netWeekRev)} sub="All pumps combined" accent={C.accent} icon="📈" spark={pumpSales.map(d=>d.petrol+d.diesel+d.cng)} trend={8} onClick={()=>setTab("analytics")}/>
            <Kpi label="Pumps Active" value={`${myPumps.filter(p=>p.status==="Active").length}/${myPumps.length}`} sub={`${myNozzles.length} nozzles total`} accent={C.blue} icon="⛽" onClick={()=>setTab("pumps")}/>
            <Kpi label="Outstanding" value={fmt(totalOutstanding)} sub={`${myCC.length} customers`} accent={totalOutstanding>100000?C.red:C.warn} icon="🤝" onClick={()=>setTab("credits")}/>
            <Kpi label="Staff" value={myMgr.length+myOp.length} sub={`${myMgr.length} mgr · ${myOp.length} op`} accent={C.purple} icon="👥" onClick={()=>setTab("staff")}/>
          </div>
          {/* Pump-wise summary cards */}
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:2}}>Pump-wise Today</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {myPumpsColored.map(pump=>{
              const pSales=mySales.filter(s=>s.pumpId===pump.id);
              const todaySale=pSales[pSales.length-1]||{petrol:0,diesel:0,cng:0};
              const rev=todaySale.petrol+todaySale.diesel+todaySale.cng;
              const pTanks=myTanks.filter(t=>t.pumpId===pump.id);
              const pLow=pTanks.filter(t=>t.stock<=t.alertAt);
              const pTests=myTests.filter(t=>t.pumpId===pump.id&&t.date===todayS());
              const pNozzles=myNozzles.filter(n=>n.pumpId===pump.id);
              const pPending=pNozzles.filter(n=>getNozzleTestStatus(myTests,n.id,pump.id,todayS())==="pending").length;
              return <div key={pump.id} style={{...G.card,padding:16,borderLeft:`3px solid ${pump._color}`,cursor:"pointer"}} onClick={()=>{setActivePump(pump.id);setTab("analytics");}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:pump._color}}>{pump.shortName}</div><div style={{fontSize:9,color:C.muted3,marginTop:2}}>{pump.city} · {pNozzles.length} nozzles</div></div>
                  <Sb s={pump.status}/>
                </div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:C.text,marginBottom:3}}>{fmtL(rev)}</div>
                <div style={{fontSize:9,color:C.muted3,marginBottom:10}}>Today's revenue</div>
                <div style={{display:"flex",gap:6}}>
                  {pLow.length>0&&<span style={{...G.badge,background:C.redDim,color:C.red,fontSize:8}}>{pLow.length} tank low</span>}
                  {pPending>0&&<span style={{...G.badge,background:C.tealDim,color:C.teal,fontSize:8}}>{pPending} test pending</span>}
                  {pTests.some(t=>t.result==="Fail")&&<span style={{...G.badge,background:C.redDim,color:C.red,fontSize:8}}>test fail</span>}
                  {pPending===0&&!pLow.length&&<span style={{...G.badge,background:C.greenDim,color:C.green,fontSize:8}}>all clear</span>}
                </div>
              </div>;
            })}
          </div>
          {/* Recent shifts */}
          <div style={G.card}>
            <div style={{padding:"12px 17px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>📋 Recent Shift Reports</div><button onClick={()=>setTab("shifts")} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"5px 11px"}}>All →</button></div>
            <Tbl heads={["Date","Pump","Shift","Manager","Sales","Variance","Status"]}>
              {myShifts.slice(0,5).map(r=><tr key={r.id}>
                <td style={{...G.td,color:C.muted3}}>{r.date}</td>
                <td style={G.td}><span style={{fontSize:10,color:myPumpsColored.find(p=>p.id===r.pumpId)?._color||C.muted3}}>{myPumpsColored.find(p=>p.id===r.pumpId)?.shortName||r.pumpId}</span></td>
                <td style={G.td}>{r.shift}</td>
                <td style={{...G.td,fontWeight:600}}>{r.manager}</td>
                <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmt(r.total)}</td>
                <td style={{...G.td,fontWeight:700,color:r.variance===0?C.green:Math.abs(r.variance)<300?C.warn:C.red}}>{r.variance===0?"✓ Nil":(r.variance>0?"+":"")+fmt(r.variance)}</td>
                <td style={G.td}><Sb s={r.status}/></td>
              </tr>)}
            </Tbl>
          </div>
        </div>}

        {/* ── CONSOLIDATED TAB ── */}
        {tab==="consolidated"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>🏗 Consolidated View</div><div style={{fontSize:11,color:C.muted3,marginTop:2}}>All pumps combined · Filter by pump or date</div></div>
          </div>
          {/* Filter bar */}
          <div style={{display:"flex",gap:9,flexWrap:"wrap",padding:"12px 15px",background:C.s2,borderRadius:11,border:`1px solid ${C.border}`}}>
            <select value={filterPumpReport} onChange={e=>setFilterPumpReport(e.target.value)} style={{...G.input,width:"auto",fontSize:10,padding:"6px 10px"}}>
              <option value="all">All Pumps</option>
              {myPumps.map(p=><option key={p.id} value={p.id}>{p.shortName||p.name}</option>)}
            </select>
            <input type="date" value={filterDateReport} onChange={e=>setFilterDateReport(e.target.value)} style={{...G.input,width:130,fontSize:10,padding:"6px 10px"}} placeholder="Filter date"/>
            {(filterPumpReport!=="all"||filterDateReport)&&<button onClick={()=>{setFilterPumpReport("all");setFilterDateReport("");}} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"6px 10px",fontSize:10}}>Clear ✕</button>}
          </div>
          {/* Consolidated KPIs */}
          {(()=>{
            const pids=filterPumpReport==="all"?myPumps.map(p=>p.id):[filterPumpReport];
            const filtSales=mySales.filter(s=>pids.includes(s.pumpId)&&(!filterDateReport||s.date===filterDateReport));
            const totRev=filtSales.reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);
            const totPetrol=filtSales.reduce((s,d)=>s+d.petrol,0);
            const totDiesel=filtSales.reduce((s,d)=>s+d.diesel,0);
            const totCNG=filtSales.reduce((s,d)=>s+d.cng,0);
            const filtShifts=myShifts.filter(r=>pids.includes(r.pumpId)&&(!filterDateReport||r.date===filterDateReport));
            const filtTests=myTests.filter(t=>pids.includes(t.pumpId)&&(!filterDateReport||t.date===filterDateReport));
            const testExcl=filtTests.reduce((s,t)=>s+t.qty*(FUEL.rates[t.fuel]||0),0);
            return <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                <Kpi label="Total Revenue" value={fmtL(totRev)} sub={`${pids.length} pump${pids.length!==1?"s":""}`} accent={C.accent} icon="💰"/>
                <Kpi label="Test Qty Excluded" value={fmt(Math.round(testExcl))} sub={`${filtTests.length} tests`} accent={C.teal} icon="🔬"/>
                <Kpi label="Net Taxable" value={fmtL(Math.max(0,totRev-testExcl))} sub="After test deduction" accent={C.green} icon="🧾"/>
                <Kpi label="Shifts Filed" value={filtShifts.length} sub={`${filtShifts.reduce((s,r)=>s+r.variance,0)>=0?"↑":"↓"} variance`} accent={C.purple} icon="📋"/>
              </div>
              {/* Fuel breakdown */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {[["Petrol",totPetrol,C.blue],["Diesel",totDiesel,C.accent],["CNG",totCNG,C.green]].map(([f,v,c])=><div key={f} style={{...G.card,padding:16}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:c}}>{fmtL(v)}</div>
                  <div style={{fontSize:10,color:C.muted3,marginTop:3}}>{f} revenue</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2}}>{fmtN(Math.round(v/FUEL.rates[f]))} {f==="CNG"?"kg":"L"} sold</div>
                </div>)}
              </div>
              {/* Pump-wise breakdown table */}
              <div style={G.card}>
                <div style={{padding:"12px 17px",borderBottom:`1px solid ${C.border}`}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>📊 Pump-wise Breakdown</div></div>
                <Tbl heads={["Pump","City","Petrol","Diesel","CNG","Total","Shifts","Tests","Variance"]}>
                  {pids.map(pid=>{
                    const pump=myPumpsColored.find(p=>p.id===pid);
                    const ps=filtSales.filter(s=>s.pumpId===pid);
                    const pr=ps.reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);
                    const pp=ps.reduce((s,d)=>s+d.petrol,0);
                    const pd2=ps.reduce((s,d)=>s+d.diesel,0);
                    const pc=ps.reduce((s,d)=>s+d.cng,0);
                    const pShifts=filtShifts.filter(r=>r.pumpId===pid);
                    const pTests=filtTests.filter(t=>t.pumpId===pid);
                    const pVar=pShifts.reduce((s,r)=>s+r.variance,0);
                    return <tr key={pid}>
                      <td style={G.td}><span style={{fontWeight:700,color:pump?._color||C.text}}>{pump?.shortName||pid}</span></td>
                      <td style={{...G.td,color:C.muted3,fontSize:10}}>{pump?.city||"—"}</td>
                      <td style={{...G.td,color:C.blue,fontWeight:600}}>{fmtL(pp)}</td>
                      <td style={{...G.td,color:C.accent,fontWeight:600}}>{fmtL(pd2)}</td>
                      <td style={{...G.td,color:C.green,fontWeight:600}}>{fmtL(pc)}</td>
                      <td style={{...G.td,fontWeight:800,color:C.accent}}>{fmtL(pr)}</td>
                      <td style={G.td}>{pShifts.length}</td>
                      <td style={G.td}>{pTests.length}</td>
                      <td style={{...G.td,color:pVar===0?C.green:Math.abs(pVar)<1000?C.warn:C.red,fontWeight:700}}>{pVar===0?"✓":(pVar>0?"+":"")+fmt(pVar)}</td>
                    </tr>;
                  })}
                  <tr style={{background:C.s2}}>
                    <td style={{...G.td,fontWeight:800,borderTop:`1px solid ${C.border}`}} colSpan={2}>TOTAL</td>
                    {[totPetrol,totDiesel,totCNG,totRev].map((v,i)=><td key={i} style={{...G.td,fontWeight:800,color:[C.blue,C.accent,C.green,C.accent][i],borderTop:`1px solid ${C.border}`}}>{fmtL(v)}</td>)}
                    <td style={{...G.td,borderTop:`1px solid ${C.border}`}} colSpan={3}>{filtShifts.length} shifts · {filtTests.length} tests</td>
                  </tr>
                </Tbl>
              </div>
              {/* Recent shifts all pumps */}
              <div style={G.card}>
                <div style={{padding:"12px 17px",borderBottom:`1px solid ${C.border}`}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>📋 Shift Reports</div></div>
                <Tbl heads={["Date","Pump","Shift","Manager","Total","Cash","Card","UPI","Variance","Status"]}>
                  {filtShifts.map(r=><tr key={r.id}>
                    <td style={{...G.td,color:C.muted3}}>{r.date}</td>
                    <td style={G.td}><span style={{color:myPumpsColored.find(p=>p.id===r.pumpId)?._color||C.muted3,fontWeight:700,fontSize:10}}>{myPumpsColored.find(p=>p.id===r.pumpId)?.shortName||r.pumpId}</span></td>
                    <td style={G.td}>{r.shift}</td>
                    <td style={{...G.td,fontWeight:600}}>{r.manager}</td>
                    <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmt(r.total)}</td>
                    <td style={G.td}>{fmt(r.cash)}</td>
                    <td style={G.td}>{fmt(r.card)}</td>
                    <td style={G.td}>{fmt(r.upi)}</td>
                    <td style={{...G.td,color:r.variance===0?C.green:Math.abs(r.variance)<300?C.warn:C.red,fontWeight:700}}>{r.variance===0?"✓":(r.variance>0?"+":"")+fmt(r.variance)}</td>
                    <td style={G.td}><Sb s={r.status}/></td>
                  </tr>)}
                </Tbl>
              </div>
            </div>;
          })()}
        </div>}

        {/* ── ANALYTICS TAB ── */}
        {tab==="analytics"&&<AdvancedAnalytics db={db} ownerId={owner.id} pumps={myPumpsColored} activePump={activePump} flash={flash}/>}
        {tab==="analytics_DISABLED_OLD"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{display:"none"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:15}}>
            <div style={{...G.card,padding:18}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:3}}>📊 Revenue by Fuel</div>
              <div style={{fontSize:10,color:C.muted3,marginBottom:13}}>₹ — Petrol · Diesel · CNG</div>
              <BarChart data={pumpSales.map(d=>({label:d.date.slice(5),petrol:d.petrol,diesel:d.diesel,cng:d.cng}))} keys={["petrol","diesel","cng"]} colors={[C.blue,C.accent,C.green]}/>
              <div style={{display:"flex",gap:13,marginTop:9}}>{[["Petrol",C.blue],["Diesel",C.accent],["CNG",C.green]].map(([l,c])=><div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted3}}><div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}</div>)}</div>
            </div>
            {!activePump&&myPumps.length>1&&<div style={{...G.card,padding:18}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:3}}>⛽ Revenue Share</div>
              <div style={{fontSize:10,color:C.muted3,marginBottom:13}}>By pump</div>
              <div style={{display:"flex",justifyContent:"center",marginBottom:13}}><Donut segs={myPumpsColored.map(p=>{const rev=mySales.filter(s=>s.pumpId===p.id).reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);return {v:rev,c:p._color};})} /></div>
              {myPumpsColored.map(p=>{const rev=mySales.filter(s=>s.pumpId===p.id).reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);const total=mySales.filter(s=>s.ownerId===owner.id).reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);return <div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:7,height:7,borderRadius:"50%",background:p._color}}/><span style={{color:C.muted3}}>{p.shortName}</span></div><span style={{fontWeight:700,color:p._color}}>{Math.round(rev/total*100)}%</span></div>;})}
            </div>}
            {(activePump||myPumps.length===1)&&<div style={{...G.card,padding:18}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:3}}>💳 Payment Mix</div>
              <div style={{display:"flex",justifyContent:"center",marginBottom:13}}><Donut segs={[{v:55,c:C.accent},{v:30,c:C.blue},{v:15,c:C.green}]}/></div>
              {[["Cash","55%",C.accent],["Card","30%",C.blue],["UPI","15%",C.green]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:7,height:7,borderRadius:"50%",background:c}}/><span style={{color:C.muted3}}>{l}</span></div><span style={{fontWeight:700,color:c}}>{v}</span></div>)}
            </div>}
          </div>
        </div>}

        {/* ── PUMPS TAB ── */}
        {tab==="pumps"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>⛽ My Pumps</div>
              <div style={{fontSize:11,color:C.muted3,marginTop:2}}>
                {myPumps.length}/{pd.pumps>=999?"∞":pd.pumps} pumps · {myNozzles.length}/{pd.nozzles>=999?"∞":pd.nozzles} nozzles
              </div>
            </div>
            <button onClick={()=>setShowAddPump(!showAddPump)} disabled={!pumpLimit.ok}
              style={{...G.btn,background:pumpLimit.ok?C.accent:C.muted,color:pumpLimit.ok?"#000":C.muted2,fontWeight:700,opacity:pumpLimit.ok?1:.6}}>
              {showAddPump?"✕ Cancel":"+ Add Pump"}
            </button>
          </div>

          {/* ADD PUMP FORM */}
          {showAddPump&&<div style={{...G.card,padding:22,borderColor:"rgba(245,166,35,.3)",borderWidth:1,borderStyle:"solid"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:C.accent,marginBottom:16}}>+ New Pump Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div><label style={G.label}>Pump Name *</label><input value={pumpF.name} onChange={e=>setPumpF(f=>({...f,name:e.target.value}))} placeholder="Full pump name" style={G.input}/></div>
              <div><label style={G.label}>Short Name *</label><input value={pumpF.shortName} onChange={e=>setPumpF(f=>({...f,shortName:e.target.value}))} placeholder="Display label" style={G.input}/></div>
              <div><label style={G.label}>City *</label><input value={pumpF.city} onChange={e=>setPumpF(f=>({...f,city:e.target.value}))} placeholder="City" style={G.input}/></div>
              <div><label style={G.label}>State</label><input value={pumpF.state} onChange={e=>setPumpF(f=>({...f,state:e.target.value}))} placeholder="State" style={G.input}/></div>
              <div><label style={G.label}>Address</label><input value={pumpF.address} onChange={e=>setPumpF(f=>({...f,address:e.target.value}))} placeholder="Full address" style={G.input}/></div>
              <div><label style={G.label}>GST Number</label><input value={pumpF.gst} onChange={e=>setPumpF(f=>({...f,gst:e.target.value}))} placeholder="GSTIN (optional)" style={G.input}/></div>
            </div>
            <div style={{display:"flex",gap:9}}>
              <button onClick={()=>setShowAddPump(false)} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`}}>Cancel</button>
              <button onClick={addPump} style={{...G.btn,background:C.accent,color:"#000",fontWeight:700}}>Add Pump →</button>
            </div>
          </div>}

          {/* PUMP CARDS */}
          {myPumpsColored.map(pump=>{
            const pNoz=myNozzles.filter(n=>n.pumpId===pump.id);
            const pMgr=myMgr.filter(m=>m.pumpId===pump.id);
            const pOp=myOp.filter(o=>o.pumpId===pump.id);
            const pTanks=myTanks.filter(t=>t.pumpId===pump.id);
            const pSales7=mySales.filter(s=>s.pumpId===pump.id);
            const rev7=pSales7.reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);
            const isEditing=editPump===pump.id;
            const isExpanded=expandedPump===pump.id;
            const isAddingNozzle=showAddNozzle===pump.id;
            const nozzleCheck=checkLimit(owner,db,"nozzles");
            return <div key={pump.id} style={{...G.card,borderTop:`3px solid ${pump._color}`}}>
              {/* ── Card Header ── */}
              <div style={{padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  {isEditing?(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
                      <div><label style={G.label}>Pump Name</label><input value={editPumpF.name} onChange={e=>setEditPumpF(f=>({...f,name:e.target.value}))} style={{...G.input,padding:"7px 10px",fontSize:11}} onFocus={e=>e.target.style.borderColor=pump._color} onBlur={e=>e.target.style.borderColor=C.border}/></div>
                      <div><label style={G.label}>Short Name</label><input value={editPumpF.shortName} onChange={e=>setEditPumpF(f=>({...f,shortName:e.target.value}))} style={{...G.input,padding:"7px 10px",fontSize:11}} onFocus={e=>e.target.style.borderColor=pump._color} onBlur={e=>e.target.style.borderColor=C.border}/></div>
                      <div><label style={G.label}>City</label><input value={editPumpF.city} onChange={e=>setEditPumpF(f=>({...f,city:e.target.value}))} style={{...G.input,padding:"7px 10px",fontSize:11}}/></div>
                      <div><label style={G.label}>State</label><input value={editPumpF.state} onChange={e=>setEditPumpF(f=>({...f,state:e.target.value}))} style={{...G.input,padding:"7px 10px",fontSize:11}}/></div>
                      <div><label style={G.label}>Address</label><input value={editPumpF.address} onChange={e=>setEditPumpF(f=>({...f,address:e.target.value}))} style={{...G.input,padding:"7px 10px",fontSize:11}}/></div>
                      <div><label style={G.label}>GST</label><input value={editPumpF.gst} onChange={e=>setEditPumpF(f=>({...f,gst:e.target.value}))} style={{...G.input,padding:"7px 10px",fontSize:11}}/></div>
                    </div>
                  ):(
                    <div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:pump._color}}>{pump.shortName}</div>
                      <div style={{fontSize:10,color:C.muted3,marginTop:1}}>{pump.name}</div>
                      <div style={{fontSize:9,color:C.muted,marginTop:1}}>📍 {pump.address||pump.city+", "+pump.state}</div>
                      {pump.gst&&<div style={{fontSize:9,color:C.muted,marginTop:1}}>GST: {pump.gst}</div>}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:7,alignItems:"flex-start",flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  <Sb s={pump.status}/>
                  {isEditing?(
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setEditPump(null)} style={{...G.btn,background:C.s3,color:C.muted2,border:`1px solid ${C.border}`,padding:"5px 10px",fontSize:10}}>Cancel</button>
                      <button onClick={saveEditPump} style={{...G.btn,background:pump._color,color:"#000",fontWeight:700,padding:"5px 12px",fontSize:10}}>Save →</button>
                    </div>
                  ):(
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>startEditPump(pump)} style={{...G.btn,background:C.s3,border:`1px solid ${C.border}`,color:C.muted2,padding:"5px 10px",fontSize:10}}>✏ Edit</button>
                      <button onClick={()=>togglePumpStatus(pump.id)} style={{...G.btn,background:pump.status==="Active"?C.warnDim:C.greenDim,color:pump.status==="Active"?C.warn:C.green,border:`1px solid ${pump.status==="Active"?"rgba(251,191,36,.3)":"rgba(0,229,179,.3)"}`,padding:"5px 10px",fontSize:10}}>
                        {pump.status==="Active"?"Disable":"Enable"}
                      </button>
                      <button onClick={()=>setExpandedPump(isExpanded?null:pump.id)} style={{...G.btn,background:pump._color+"20",color:pump._color,border:`1px solid ${pump._color}40`,padding:"5px 12px",fontSize:10,fontWeight:700}}>
                        {isExpanded?"▲ Hide":"▼ Nozzles"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Stats Row ── */}
              {!isEditing&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:0,borderTop:`1px solid ${C.border}`,borderBottom:isExpanded?`1px solid ${C.border}`:"none"}}>
                {[["Nozzles",pNoz.length,C.blue,"⛽"],["Managers",pMgr.length,C.purple,"🗂"],["Operators",pOp.length,C.green,"👷"],["Tanks",pTanks.length,C.teal,"🛢"],["7d Revenue",fmtL(rev7),pump._color,"💰"]].map(([l,v,c,icon],i)=>(
                  <div key={l} style={{padding:"10px 14px",borderRight:i<4?`1px solid ${C.border}`:"none",background:C.s2}}>
                    <div style={{fontSize:8,color:C.muted3,marginBottom:3}}>{icon} {l}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:c}}>{v}</div>
                  </div>
                ))}
              </div>}

              {/* ── NOZZLE MANAGEMENT PANEL (expanded) ── */}
              {isExpanded&&!isEditing&&<div style={{padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>⛽ Nozzles — {pump.shortName}</div>
                  <button onClick={()=>{setShowAddNozzle(isAddingNozzle?null:pump.id);setNozzleF({id:"",fuel:"Petrol",openReading:"",operator:"",status:"Active"});}}
                    disabled={!nozzleCheck.ok}
                    style={{...G.btn,background:nozzleCheck.ok?pump._color+"20":C.s3,color:nozzleCheck.ok?pump._color:C.muted2,border:`1px solid ${nozzleCheck.ok?pump._color+"40":C.border}`,padding:"5px 12px",fontSize:10,fontWeight:700}}>
                    {isAddingNozzle?"✕ Cancel":"+ Add Nozzle"}
                  </button>
                </div>

                {/* Add nozzle form */}
                {isAddingNozzle&&<div style={{background:C.s2,borderRadius:12,padding:16,marginBottom:14,border:`1px solid ${pump._color}30`}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:pump._color,marginBottom:12}}>+ New Nozzle for {pump.shortName}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
                    <div>
                      <label style={G.label}>Nozzle ID *</label>
                      <input value={nozzleF.id} onChange={e=>setNozzleF(f=>({...f,id:e.target.value}))} placeholder="e.g. N-05" style={G.input} onFocus={e=>e.target.style.borderColor=pump._color} onBlur={e=>e.target.style.borderColor=C.border}/>
                    </div>
                    <div>
                      <label style={G.label}>Fuel Type *</label>
                      <select value={nozzleF.fuel} onChange={e=>setNozzleF(f=>({...f,fuel:e.target.value}))} style={{...G.input,cursor:"pointer"}}>
                        <option>Petrol</option><option>Diesel</option><option>CNG</option>
                      </select>
                    </div>
                    <div>
                      <label style={G.label}>Opening Reading (L) *</label>
                      <input type="number" step="0.01" value={nozzleF.openReading} onChange={e=>setNozzleF(f=>({...f,openReading:e.target.value}))} placeholder="e.g. 12500.00" style={G.input} onFocus={e=>e.target.style.borderColor=pump._color} onBlur={e=>e.target.style.borderColor=C.border}/>
                    </div>
                    <div>
                      <label style={G.label}>Assigned Operator</label>
                      <select value={nozzleF.operator} onChange={e=>setNozzleF(f=>({...f,operator:e.target.value}))} style={{...G.input,cursor:"pointer"}}>
                        <option value="">— Unassigned —</option>
                        {pOp.map(op=><option key={op.id} value={op.name}>{op.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={G.label}>Status</label>
                      <select value={nozzleF.status} onChange={e=>setNozzleF(f=>({...f,status:e.target.value}))} style={{...G.input,cursor:"pointer"}}>
                        <option>Active</option><option>Idle</option><option>Maintenance</option>
                      </select>
                    </div>
                  </div>
                  <div style={{background:pump._color+"10",border:`1px solid ${pump._color}20`,borderRadius:9,padding:"9px 13px",fontSize:10,color:C.muted3,marginBottom:12}}>
                    <strong style={{color:pump._color}}>⚠ Note:</strong> The opening reading is the current meter reading on this nozzle. All future shifts will automatically start from this reading onwards.
                  </div>
                  <button onClick={()=>addNozzle(pump.id)} style={{...G.btn,background:pump._color,color:"#000",fontWeight:700}}>Add Nozzle →</button>
                </div>}

                {/* Nozzle table */}
                {pNoz.length===0?(
                  <div style={{textAlign:"center",padding:"22px 0",color:C.muted,fontSize:12}}>No nozzles added yet — click "+ Add Nozzle" to get started</div>
                ):(
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>
                        {["Nozzle ID","Fuel","Current Reading","Assigned Operator","Status","Actions"].map(h=><th key={h} style={G.th}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {pNoz.map(n=>{
                          const fc=FUEL.colors[n.fuel];
                          return <NozzleEditRow key={n.id+n.pumpId} nozzle={n} pumpColor={pump._color} fc={fc}
                            onUpdateReading={(nid,pid,val)=>updateNozzleReading(nid,pid,val)}
                            onRemove={(nid,pid)=>removeNozzle(nid,pid)}
                            flash={flash}/>;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {pNoz.length>0&&<div style={{marginTop:12,display:"flex",gap:10,fontSize:10,color:C.muted3,padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
                  <span>⛽ {pNoz.filter(n=>n.fuel==="Petrol").length} Petrol</span>
                  <span>🛢 {pNoz.filter(n=>n.fuel==="Diesel").length} Diesel</span>
                  {pNoz.some(n=>n.fuel==="CNG")&&<span>🟢 {pNoz.filter(n=>n.fuel==="CNG").length} CNG</span>}
                  <span style={{marginLeft:"auto"}}>Plan: {myNozzles.length}/{pd.nozzles>=999?"∞":pd.nozzles} nozzles used</span>
                </div>}
              </div>}

              {/* Quick actions row (collapsed state) */}
              {!isExpanded&&!isEditing&&<div style={{padding:"10px 18px",display:"flex",gap:8,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
                <button onClick={()=>{setActivePump(pump.id);setTab("analytics");}} style={{...G.btn,background:pump._color+"18",color:pump._color,border:`1px solid ${pump._color}30`,padding:"4px 11px",fontSize:10}}>📈 Analytics</button>
                <button onClick={()=>{setActivePump(pump.id);setTab("testing");}} style={{...G.btn,background:C.s3,color:C.muted2,border:`1px solid ${C.border}`,padding:"4px 11px",fontSize:10}}>🔬 Tests</button>
                <button onClick={()=>{setActivePump(pump.id);setTab("shifts");}} style={{...G.btn,background:C.s3,color:C.muted2,border:`1px solid ${C.border}`,padding:"4px 11px",fontSize:10}}>📋 Shifts</button>
                <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted3}}>
                  <span style={{color:pump._color,fontWeight:700}}>{pNoz.length}</span> nozzles
                </span>
              </div>}
            </div>;
          })}
        </div>}

        {/* ── TESTING TAB ── */}
        {tab==="testing"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>🔬 Machine Testing</div><div style={{fontSize:11,color:C.muted3,marginTop:2}}>W&amp;M Act compliance · Test qty excluded from sales, revenue &amp; GST</div></div>
            <button onClick={()=>setShowTestForm(true)} style={{...G.btn,background:C.teal,color:"#000",padding:"8px 18px",fontWeight:700,fontSize:13}}>+ New Test</button>
          </div>
          {/* Pump-wise test status */}
          {myPumps.map(pump=>{
            const pNoz=myNozzles.filter(n=>n.pumpId===pump.id);
            const pTests=myTests.filter(t=>t.pumpId===pump.id);
            const pTodayTests=pTests.filter(t=>t.date===todayS());
            const pendingP=pNoz.filter(n=>getNozzleTestStatus(pTests,n.id,pump.id,todayS())==="pending").length;
            const pumpCol=myPumpsColored.find(p=>p.id===pump.id)?._color||C.accent;
            return <div key={pump.id} style={{...G.card,padding:16,borderLeft:`3px solid ${pumpCol}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:pumpCol}}>{pump.shortName} — Today's Tests</div>
                {pendingP>0?<span style={{...G.badge,background:C.tealDim,color:C.teal}}>{pendingP} pending</span>:<span style={{...G.badge,background:C.greenDim,color:C.green}}>✓ All tested</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
                {pNoz.map(n=>{
                  const st=getNozzleTestStatus(pTests,n.id,pump.id,todayS());
                  const SC={pass:C.green,fail:C.red,warning:C.warn,pending:C.muted2};
                  const SI={pass:"✓",fail:"✗",warning:"⚠",pending:"○"};
                  const lastT=pTodayTests.filter(t=>t.nozzleId===n.id)[0];
                  return <div key={n.id} style={{background:C.s2,borderRadius:9,padding:"10px 12px",borderLeft:`3px solid ${SC[st]||C.muted2}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:FUEL.colors[n.fuel]}}>{n.id}</span>
                      <span style={{fontSize:14,color:SC[st]}}>{SI[st]}</span>
                    </div>
                    <div style={{fontSize:9,color:C.muted3,marginBottom:4}}>{n.fuel}</div>
                    {lastT?<div style={{fontSize:9,color:SC[st]}}>{lastT.variance}ml variance</div>:<div style={{fontSize:9,color:C.muted}}>Not tested today</div>}
                  </div>;
                })}
              </div>
            </div>;
          })}
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14}}>📋 Test History</div>
          <MachineTestLog tests={myTests} nozzles={myNozzles} pumps={myPumpsColored} showFilter={true}/>
        </div>}

        {/* ── TANKS TAB ── */}
        {tab==="tanks"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>🛢 Stock &amp; Tanks</div>
          {myPumps.map(pump=>{
            const pTanks=myTanks.filter(t=>t.pumpId===pump.id);
            const pumpCol=myPumpsColored.find(p=>p.id===pump.id)?._color||C.accent;
            return <div key={pump.id}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:pumpCol,marginBottom:10}}>⛽ {pump.shortName}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
                {pTanks.map(t=>{
                  const pct=Math.round(t.stock/t.capacity*100);
                  const isLow=t.stock<=t.alertAt;
                  const col=pct<20?C.red:pct<40?C.warn:FUEL.colors[t.fuel];
                  return <div key={t.id} style={{...G.card,padding:17,position:"relative",overflow:"hidden"}}>
                    {isLow&&<div style={{position:"absolute",top:8,right:10,fontSize:17}}>⚠️</div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:col}}>{t.fuel}</div><div style={{fontSize:10,color:C.muted3,marginTop:1}}>{fmtN(t.capacity)}L capacity</div></div>
                    </div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,marginBottom:3}}>{fmtN(t.stock)}<span style={{fontSize:12,fontWeight:400,color:C.muted3}}>L</span></div>
                    <div style={{height:6,background:C.s3,borderRadius:3,marginBottom:8,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:col,borderRadius:3}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted3}}>
                      <span>{pct}% full</span><span>Alert at {fmtN(t.alertAt)}L</span>
                    </div>
                    <div style={{marginTop:10,display:"flex",gap:8,alignItems:"center"}}>
                      <input value={dipF[t.id]||""} onChange={e=>setDipF(f=>({...f,[t.id]:e.target.value}))} placeholder="Dip reading (cm)" style={{...G.input,fontSize:11,padding:"6px 10px",flex:1}}/>
                      <button onClick={()=>{if(!dipF[t.id])return;setDb(d=>({...d,tanks:d.tanks.map(tk=>tk.id===t.id?{...tk,dip:parseFloat(dipF[t.id]),updated:todayS()}:tk)}));setDipF(f=>({...f,[t.id]:""}));flash("✓ Dip updated: "+t.fuel+" tank");}} style={{...G.btn,background:col,color:"#000",padding:"6px 10px",fontSize:10,fontWeight:700}}>Update</button>
                    </div>
                  </div>;
                })}
              </div>
            </div>;
          })}
        </div>}

        {/* ── PLANS & LIMITS TAB ── */}
        {tab==="plans"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>💳 Plans &amp; Subscription Limits</div>
          {/* Current usage */}
          <div style={{...G.card,padding:18,borderColor:`${pd.color}40`}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:pd.color,marginBottom:14}}>{pd.icon} Current Plan: {owner.plan}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              <LimitBar label="Pumps" used={myPumps.length} max={pd.pumps} color={pd.color}/>
              <LimitBar label="Total Nozzles" used={myNozzles.length} max={pd.nozzles} color={pd.color}/>
              <LimitBar label="Total Staff" used={myMgr.length+myOp.length} max={pd.staff} color={pd.color}/>
              <LimitBar label="Managers" used={myMgr.length} max={pd.managers} color={pd.color}/>
              <LimitBar label="Credit Customers" used={myCC.length} max={pd.creditCustomers} color={pd.color}/>
              <LimitBar label="Tanks" used={myTanks.length} max={pd.tanks} color={pd.color}/>
            </div>
            {daysLeft>0&&daysLeft<=7&&<div style={{marginTop:14,background:"rgba(251,191,36,.07)",border:`1px solid rgba(251,191,36,.2)`,borderRadius:9,padding:"9px 14px",fontSize:11,color:C.warn}}>⚠ Your plan expires in {daysLeft} day{daysLeft!==1?"s":""}. Renew to avoid service interruption.</div>}
          </div>
          <div style={{display:"flex",gap:9,marginBottom:5}}>{["monthly","yearly"].map(b=><button key={b} onClick={()=>setBilling(b)} style={{...G.btn,background:billing===b?C.s1:"transparent",color:billing===b?C.text:C.muted2,border:`1px solid ${billing===b?C.border:"transparent"}`,padding:"7px 16px"}}>{b==="yearly"?"Annual (save 17%)":"Monthly"}</button>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {Object.entries(PLANS).map(([name,p])=>{
              const isCur=owner.plan===name;
              const isUp=planRank[name]>planRank[owner.plan];
              const isDown=planRank[name]<planRank[owner.plan];
              const price=billing==="yearly"?p.yearly:p.price;
              const cred=isUp&&owner?proRata(owner.amountPaid,owner.billing,owner.daysUsed):0;
              return <div key={name} style={{...G.card,padding:20,position:"relative",overflow:"hidden",borderColor:isCur?p.color:C.border}}>
                {isCur&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:p.color}}/>}
                {name==="Pro"&&!isCur&&<div style={{position:"absolute",top:10,right:10,background:C.accent,color:"#000",fontSize:8,fontWeight:800,padding:"2px 8px",borderRadius:4}}>POPULAR</div>}
                <div style={{fontSize:28,marginBottom:6}}>{p.icon}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:19,color:isCur?p.color:C.text,marginBottom:3}}>{name}</div>
                <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                  {isCur&&<span style={{...G.badge,background:`${p.color}18`,color:p.color}}>✓ Current</span>}
                  {isUp&&<span style={{...G.badge,background:"rgba(0,229,179,.12)",color:C.green}}>↑ Upgrade</span>}
                  {isDown&&<span style={{...G.badge,background:"rgba(251,191,36,.12)",color:C.warn}}>↓ Downgrade</span>}
                </div>
                <div style={{marginBottom:13}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:isCur?p.color:C.text}}>{fmt(price)}</span>
                  <span style={{fontSize:10,color:C.muted3}}>/{billing==="yearly"?"yr":"mo"} +GST</span>
                </div>
                {/* Plan limits summary */}
                <div style={{background:C.s2,borderRadius:8,padding:"10px 12px",marginBottom:13,fontSize:10}}>
                  {[[`${p.pumps>=999?"Unlimited":p.pumps} Pump${p.pumps!==1?"s":""}`,"⛽"],[`${p.nozzles>=999?"Unlimited":p.nozzles} Nozzles`,"🔧"],[`${p.staff>=999?"Unlimited":p.staff} Staff`,"👥"],[`${p.creditCustomers>=999?"Unlimited":p.creditCustomers} Credit Customers`,"🤝"]].map(([f,icon])=><div key={f} style={{display:"flex",gap:6,color:C.muted3,marginBottom:4}}><span>{icon}</span>{f}</div>)}
                </div>
                {isUp&&cred>0&&<div style={{background:"rgba(0,229,179,.06)",border:`1px solid rgba(0,229,179,.15)`,borderRadius:7,padding:"8px 11px",marginBottom:11,fontSize:10,color:C.green}}>Pro-rata credit: {fmt(cred)}</div>}
                <button onClick={()=>!isCur&&setGw({plan:name,billing})} disabled={isCur} style={{...G.btn,width:"100%",justifyContent:"center",background:isCur?C.s2:p.color,color:isCur?C.muted2:(p.color===C.accent?"#000":"#fff"),padding:"10px",fontWeight:700,opacity:isCur?.7:1}}>{isCur?"Current Plan":isUp?"Upgrade →":"Switch Plan"}</button>
              </div>;
            })}
          </div>
        </div>}

        {/* ── BILLING TAB ── */}
        {tab==="billing"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          {rzpOrder&&<RazorpayGateway {...rzpOrder} owner={owner}
            onSuccess={info=>{paySuccess(info);setRzpOrder(null);}}
            onCancel={()=>setRzpOrder(null)}
          />}
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>📜 Billing History</div>
          <div style={G.card}>
            <Tbl heads={["TXN ID","Plan","Billing","Base","GST","Total","Date","Method","Status"]}>
              {myTxn.map(t=><tr key={t.id}>
                <td style={{...G.td,fontFamily:"monospace",fontSize:10,color:C.muted3}}>{t.id}</td>
                <td style={G.td}>{t.plan}</td>
                <td style={G.td}>{t.billing}</td>
                <td style={G.td}>{fmt(t.base)}</td>
                <td style={G.td}>{fmt(t.gst)}</td>
                <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmt(t.amount)}</td>
                <td style={{...G.td,color:C.muted3}}>{t.date}</td>
                <td style={G.td}>{t.method}</td>
                <td style={G.td}><Sb s={t.status}/></td>
              </tr>)}
            </Tbl>
          </div>
        </div>}

        {/* ── CREDITS TAB ── */}
        {tab==="credits"&&(()=>{
  const[ccMode,setCcMode]=useState("list"); // list | add | edit | txn
  const[selCC,setSelCC]=useState(null);
  const[ccF,setCcF2]=useState({name:"",phone:"",limit:"",pumpId:"",notes:""});
  const[txnF,setTxnF]=useState({type:"sale",amount:"",desc:"",date:todayS()});
  const[filter,setFilter]=useState("all");

  const myCC=db.creditCustomers.filter(c=>c.ownerId===owner.id);
  const filtCC=filter==="all"?myCC:filter==="high"?myCC.filter(c=>c.outstanding/c.limit>.7):myCC.filter(c=>c.status===filter);
  const totalOut=myCC.reduce((s,c)=>s+c.outstanding,0);
  const totalLimit=myCC.reduce((s,c)=>s+c.limit,0);
  const ccTxns=db.creditTxns||[];

  const saveCC=()=>{
    if(!ccF.name||!ccF.limit)return;
    if(ccMode==="add"){
      const nc={id:"CC"+rid(),ownerId:owner.id,pumpId:ccF.pumpId||myPumps[0]?.id,name:ccF.name,phone:ccF.phone,limit:parseInt(ccF.limit)||0,outstanding:0,lastTxn:todayS(),status:"Active",notes:ccF.notes,txns:[]};
      setDb(d=>({...d,creditCustomers:[...d.creditCustomers,nc]}));
      flash("✓ Credit customer added: "+ccF.name);
    } else {
      setDb(d=>({...d,creditCustomers:d.creditCustomers.map(x=>x.id===selCC.id?{...x,name:ccF.name,phone:ccF.phone,limit:parseInt(ccF.limit)||x.limit,pumpId:ccF.pumpId||x.pumpId,notes:ccF.notes}:x)}));
      flash("✓ "+ccF.name+" updated");
    }
    setCcMode("list");setCcF2({name:"",phone:"",limit:"",pumpId:"",notes:""});setSelCC(null);
  };
  const deleteCC=id=>{
    if(!window.confirm("Delete this credit customer?"))return;
    setDb(d=>({...d,creditCustomers:d.creditCustomers.filter(x=>x.id!==id)}));
    flash("✓ Customer deleted");
  };
  const addTxn=()=>{
    const amt=parseFloat(txnF.amount)||0;
    if(!amt||!selCC)return;
    const txn={id:"CTX"+rid(),customerId:selCC.id,type:txnF.type,amount:amt,desc:txnF.desc||txnF.type,date:txnF.date,time:new Date().toLocaleTimeString()};
    const newOut=txnF.type==="sale"?selCC.outstanding+amt:Math.max(0,selCC.outstanding-amt);
    setDb(d=>({...d,
      creditCustomers:d.creditCustomers.map(x=>x.id===selCC.id?{...x,outstanding:newOut,lastTxn:txnF.date}:x),
      creditTxns:[...(d.creditTxns||[]),txn]
    }));
    flash(`✓ ${txnF.type==="sale"?"Sale":"Payment"} of ${fmt(amt)} recorded for ${selCC.name}`);
    setTxnF({type:"sale",amount:"",desc:"",date:todayS()});
    setSelCC(cc=>cc?{...cc,outstanding:newOut}:null);
  };
  const startEdit=cc=>{setCcMode("edit");setSelCC(cc);setCcF2({name:cc.name,phone:cc.phone||"",limit:String(cc.limit),pumpId:cc.pumpId||"",notes:cc.notes||""});};

  return <div style={{display:"flex",flexDirection:"column",gap:15}}>
    {/* Header + KPIs */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>🤝 Credit Customers</div>
        <div style={{fontSize:11,color:C.muted3,marginTop:2}}>{myCC.length}/{pd.creditCustomers>=999?"∞":pd.creditCustomers} used · ₹{totalOut.toLocaleString()} outstanding of ₹{totalLimit.toLocaleString()} total limit</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        {ccMode!=="add"&&<button onClick={()=>{setCcMode("add");setSelCC(null);setCcF2({name:"",phone:"",limit:"",pumpId:"",notes:""});}} disabled={!checkLimit(owner,db,"creditCustomers").ok} style={{...G.btn,background:checkLimit(owner,db,"creditCustomers").ok?C.green:C.muted,color:"#000",fontWeight:700,opacity:checkLimit(owner,db,"creditCustomers").ok?1:.6}}>+ New Customer</button>}
        {(ccMode==="add"||ccMode==="edit")&&<button onClick={()=>{setCcMode("list");setSelCC(null);}} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`}}>✕ Cancel</button>}
      </div>
    </div>
    {/* Summary KPIs */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
      <Kpi label="Total Customers" value={myCC.length} accent={C.blue} icon="👥"/>
      <Kpi label="Total Outstanding" value={fmtL(totalOut)} sub={`of ${fmtL(totalLimit)} limit`} accent={totalOut/totalLimit>.8?C.red:totalOut/totalLimit>.5?C.warn:C.green} icon="💰"/>
      <Kpi label="High Risk (>70%)" value={myCC.filter(c=>c.outstanding/c.limit>.7).length} accent={C.warn} icon="⚠️"/>
      <Kpi label="Active" value={myCC.filter(c=>c.status==="Active").length} accent={C.green} icon="✅"/>
    </div>
    {/* Add / Edit form */}
    {(ccMode==="add"||ccMode==="edit")&&<div style={{...G.card,padding:20,borderColor:ccMode==="add"?"rgba(0,229,179,.35)":"rgba(167,139,250,.35)"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:16,color:ccMode==="add"?C.green:C.purple}}>{ccMode==="add"?"➕ New Credit Customer":"✏️ Edit: "+selCC?.name}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
        <div><label style={G.label}>Full Name *</label><input value={ccF.name} onChange={e=>setCcF2(f=>({...f,name:e.target.value}))} style={G.input} placeholder="Patel Trucks Ltd"/></div>
        <div><label style={G.label}>Phone</label><input value={ccF.phone} onChange={e=>setCcF2(f=>({...f,phone:e.target.value}))} style={G.input} placeholder="+91 98765 43210"/></div>
        <div><label style={G.label}>Credit Limit (₹) *</label><input type="number" value={ccF.limit} onChange={e=>setCcF2(f=>({...f,limit:e.target.value}))} style={G.input} placeholder="50000"/></div>
        <div><label style={G.label}>Pump</label><select value={ccF.pumpId} onChange={e=>setCcF2(f=>({...f,pumpId:e.target.value}))} style={{...G.input,cursor:"pointer"}}><option value="">— Select Pump —</option>{myPumps.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}</select></div>
        <div style={{gridColumn:"2/-1"}}><label style={G.label}>Notes</label><input value={ccF.notes} onChange={e=>setCcF2(f=>({...f,notes:e.target.value}))} style={G.input} placeholder="Vehicle fleet, payment terms, contact notes..."/></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={saveCC} style={{...G.btn,background:ccMode==="add"?C.green:C.purple,color:"#000",fontWeight:700}}>{ccMode==="add"?"Add Customer →":"Save Changes →"}</button>
      </div>
    </div>}
    {/* Transaction panel for selected customer */}
    {ccMode==="txn"&&selCC&&<div style={{...G.card,padding:20,borderColor:"rgba(6,182,212,.35)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:C.teal}}>💳 Transactions — {selCC.name}</div>
          <div style={{fontSize:10,color:C.muted3,marginTop:2}}>Outstanding: <span style={{fontWeight:700,color:selCC.outstanding/selCC.limit>.9?C.red:C.text}}>₹{selCC.outstanding.toLocaleString()}</span> of ₹{selCC.limit.toLocaleString()} limit</div>
        </div>
        <button onClick={()=>{setCcMode("list");setSelCC(null);}} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"5px 11px",fontSize:10}}>✕ Close</button>
      </div>
      {/* Add txn form */}
      <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:11,marginBottom:10,color:C.muted3}}>Record Transaction</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={G.label}>Type</label>
            <div style={{display:"flex",gap:6}}>
              {[["sale","Sale","↑",C.red],["payment","Payment","↓",C.green]].map(([t,l,ic,c])=>(
                <div key={t} onClick={()=>setTxnF(f=>({...f,type:t}))} style={{flex:1,padding:"7px",borderRadius:7,border:`1px solid ${txnF.type===t?c:C.border}`,background:txnF.type===t?c+"18":"transparent",cursor:"pointer",textAlign:"center",fontSize:10,fontWeight:700,color:txnF.type===t?c:C.muted3}}>{ic} {l}</div>
              ))}
            </div>
          </div>
          <div><label style={G.label}>Amount (₹)</label><input type="number" value={txnF.amount} onChange={e=>setTxnF(f=>({...f,amount:e.target.value}))} style={G.input} placeholder="5000"/></div>
          <div><label style={G.label}>Date</label><input type="date" value={txnF.date} onChange={e=>setTxnF(f=>({...f,date:e.target.value}))} style={G.input}/></div>
          <div><label style={G.label}>Description</label><input value={txnF.desc} onChange={e=>setTxnF(f=>({...f,desc:e.target.value}))} style={G.input} placeholder="Diesel fill, cash collected..."/></div>
        </div>
        <button onClick={addTxn} style={{...G.btn,background:txnF.type==="sale"?C.red:C.green,color:"#fff",fontWeight:700}}>
          {txnF.type==="sale"?"↑ Add Sale":"↓ Record Payment"}
        </button>
      </div>
      {/* Transaction history */}
      <div style={{fontWeight:700,fontSize:11,color:C.muted3,marginBottom:8}}>Transaction History</div>
      {ccTxns.filter(t=>t.customerId===selCC.id).length===0&&<div style={{padding:"16px",textAlign:"center",color:C.muted3,fontSize:11}}>No transactions yet</div>}
      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:240,overflowY:"auto"}}>
        {ccTxns.filter(t=>t.customerId===selCC.id).slice().reverse().map(t=>(
          <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:C.s2,borderRadius:8,borderLeft:`3px solid ${t.type==="sale"?C.red:C.green}`}}>
            <div><div style={{fontSize:11,fontWeight:600,color:t.type==="sale"?C.red:C.green}}>{t.type==="sale"?"↑":"↓"} {t.desc||t.type}</div><div style={{fontSize:9,color:C.muted3}}>{t.date} · {t.time}</div></div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:t.type==="sale"?C.red:C.green}}>{t.type==="sale"?"+":"-"}₹{t.amount.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>}
    {/* Filter bar */}
    {ccMode==="list"&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["all","All"],["Active","Active"],["Inactive","Inactive"],["high","High Risk"]].map(([f,l])=>(
        <div key={f} onClick={()=>setFilter(f)} style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",border:`1px solid ${filter===f?C.blue:C.border}`,background:filter===f?C.blueDim:"transparent",color:filter===f?C.blue:C.muted3,fontSize:10,fontWeight:700}}>{l}</div>
      ))}
    </div>}
    {/* Customer table */}
    {ccMode==="list"&&<div style={G.card}>
      {filtCC.length===0&&<div style={{padding:28,textAlign:"center",color:C.muted3,fontSize:12}}>No customers found. Add your first credit customer above.</div>}
      {filtCC.length>0&&<table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>
          <th style={G.th}>Customer</th><th style={G.th}>Pump</th><th style={G.th}>Limit</th>
          <th style={G.th}>Outstanding</th><th style={G.th}>Utilization</th><th style={G.th}>Last Txn</th>
          <th style={G.th}>Status</th><th style={G.th}>Actions</th>
        </tr></thead>
        <tbody>{filtCC.map(cc=>{
          const u=cc.limit>0?Math.round(cc.outstanding/cc.limit*100):0;
          const uc=u>90?C.red:u>70?C.warn:C.green;
          const pump=myPumpsColored.find(p=>p.id===cc.pumpId);
          return <tr key={cc.id}>
            <td style={{...G.td,fontWeight:600}}>
              <div>{cc.name}</div>
              {cc.phone&&<div style={{fontSize:9,color:C.muted3,marginTop:1}}>{cc.phone}</div>}
              {cc.notes&&<div style={{fontSize:9,color:C.muted,marginTop:1,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cc.notes}</div>}
            </td>
            <td style={{...G.td,fontSize:10,color:pump?._color||C.muted3,fontWeight:600}}>{pump?.shortName||"—"}</td>
            <td style={G.td}>{fmt(cc.limit)}</td>
            <td style={{...G.td,fontWeight:700,color:uc}}>{fmt(cc.outstanding)}</td>
            <td style={G.td}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{flex:1,height:5,background:C.s3,borderRadius:3,minWidth:60}}>
                  <div style={{height:"100%",width:Math.min(u,100)+"%",background:uc,borderRadius:3,transition:"width .3s"}}/>
                </div>
                <span style={{fontSize:9,color:uc,fontWeight:700,minWidth:28}}>{u}%</span>
              </div>
            </td>
            <td style={{...G.td,color:C.muted3,fontSize:10}}>{cc.lastTxn}</td>
            <td style={G.td}><Sb s={cc.status}/></td>
            <td style={G.td}>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                <button onClick={()=>{setCcMode("txn");setSelCC(cc);}} style={{...G.btn,background:C.tealDim,color:C.teal,border:`1px solid rgba(6,182,212,.3)`,padding:"4px 9px",fontSize:9}}>💳 Txns</button>
                <button onClick={()=>startEdit(cc)} style={{...G.btn,background:C.purpleDim,color:C.purple,border:`1px solid rgba(167,139,250,.3)`,padding:"4px 9px",fontSize:9}}>✏️</button>
                <button onClick={()=>{setDb(d=>({...d,creditCustomers:d.creditCustomers.map(x=>x.id===cc.id?{...x,status:x.status==="Active"?"Inactive":"Active"}:x)}));flash("Status toggled");}} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"4px 9px",fontSize:9}}>{cc.status==="Active"?"Pause":"Resume"}</button>
                <button onClick={()=>deleteCC(cc.id)} style={{...G.btn,background:C.redDim,color:C.red,border:`1px solid rgba(244,63,94,.3)`,padding:"4px 9px",fontSize:9}}>🗑</button>
              </div>
            </td>
          </tr>;
        })}</tbody>
      </table>}
    </div>}
  </div>;
})()}
        {/* ── STAFF TAB ── */}
        {tab==="staff"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>👥 Staff Management</div><div style={{fontSize:11,color:C.muted3,marginTop:2}}>{myMgr.length+myOp.length}/{pd.staff>=999?"∞":pd.staff} staff used</div></div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowAM(!showAM)} disabled={!checkLimit(owner,db,"managers").ok} style={{...G.btn,background:C.blue,color:"#fff",fontWeight:700,opacity:checkLimit(owner,db,"managers").ok?1:.6}}>+ Manager</button>
              <button onClick={()=>setShowAO(!showAO)} disabled={myMgr.length+myOp.length>=pd.staff} style={{...G.btn,background:C.green,color:"#000",fontWeight:700,opacity:myMgr.length+myOp.length<pd.staff?1:.6}}>+ Operator</button>
            </div>
          </div>
          {showAM&&<div style={{...G.card,padding:19,borderColor:"rgba(75,141,248,.3)"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:14,color:C.blue}}>+ New Manager</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:13}}>
              <div><label style={G.label}>Name</label><input value={mgrF.name} onChange={e=>setMgrF(f=>({...f,name:e.target.value}))} style={G.input}/></div>
              <div><label style={G.label}>Email</label><input value={mgrF.email} onChange={e=>setMgrF(f=>({...f,email:e.target.value}))} style={G.input}/></div>
              <div><label style={G.label}>Password</label><input type="password" value={mgrF.password} onChange={e=>setMgrF(f=>({...f,password:e.target.value}))} style={G.input}/></div>
              <div><label style={G.label}>Phone</label><input value={mgrF.phone} onChange={e=>setMgrF(f=>({...f,phone:e.target.value}))} style={G.input}/></div>
              <div><label style={G.label}>Pump</label><select value={mgrF.pumpId} onChange={e=>setMgrF(f=>({...f,pumpId:e.target.value}))} style={{...G.input,cursor:"pointer"}}><option value="">— Select —</option>{myPumps.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}</select></div>
              <div><label style={G.label}>Shift</label><select value={mgrF.shift} onChange={e=>setMgrF(f=>({...f,shift:e.target.value}))} style={{...G.input,cursor:"pointer"}}>{["Morning","Afternoon","Night"].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={G.label}>Salary</label><input type="number" value={mgrF.salary} onChange={e=>setMgrF(f=>({...f,salary:e.target.value}))} style={G.input}/></div>
            </div>
            <div style={{display:"flex",gap:9}}>
              <button onClick={()=>setShowAM(false)} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`}}>Cancel</button>
              <button onClick={()=>{if(!mgrF.name||!mgrF.email||!mgrF.pumpId)return;const nm={id:"M"+rid(),ownerId:owner.id,pumpId:mgrF.pumpId,name:mgrF.name,email:mgrF.email,password:mgrF.password,phone:mgrF.phone,shift:mgrF.shift,status:"Active",salary:parseInt(mgrF.salary)||0};setDb(d=>({...d,managers:[...d.managers,nm]}));flash("✓ Manager added: "+mgrF.name);setMgrF({name:"",email:"",phone:"",password:"",shift:"Morning",pumpId:"",salary:""});setShowAM(false);}} style={{...G.btn,background:C.blue,color:"#fff",fontWeight:700}}>Add Manager →</button>
            </div>
          </div>}
          {showAO&&<div style={{...G.card,padding:19,borderColor:"rgba(0,229,179,.3)"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:14,color:C.green}}>+ New Operator</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:13}}>
              <div><label style={G.label}>Name</label><input value={opF.name} onChange={e=>setOpF(f=>({...f,name:e.target.value}))} style={G.input}/></div>
              <div><label style={G.label}>Email</label><input value={opF.email} onChange={e=>setOpF(f=>({...f,email:e.target.value}))} style={G.input}/></div>
              <div><label style={G.label}>Password</label><input type="password" value={opF.password} onChange={e=>setOpF(f=>({...f,password:e.target.value}))} style={G.input}/></div>
              <div><label style={G.label}>Phone</label><input value={opF.phone} onChange={e=>setOpF(f=>({...f,phone:e.target.value}))} style={G.input}/></div>
              <div><label style={G.label}>Pump</label><select value={opF.pumpId} onChange={e=>setOpF(f=>({...f,pumpId:e.target.value}))} style={{...G.input,cursor:"pointer"}}><option value="">— Select —</option>{myPumps.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}</select></div>
              <div><label style={G.label}>Shift</label><select value={opF.shift} onChange={e=>setOpF(f=>({...f,shift:e.target.value}))} style={{...G.input,cursor:"pointer"}}>{["Morning","Afternoon","Night"].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={G.label}>Assigned Nozzles (comma sep.)</label><input value={opF.nozzles} onChange={e=>setOpF(f=>({...f,nozzles:e.target.value}))} placeholder="N-01, N-02" style={G.input}/></div>
              <div><label style={G.label}>Salary</label><input type="number" value={opF.salary} onChange={e=>setOpF(f=>({...f,salary:e.target.value}))} style={G.input}/></div>
            </div>
            <div style={{display:"flex",gap:9}}>
              <button onClick={()=>setShowAO(false)} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`}}>Cancel</button>
              <button onClick={()=>{if(!opF.name||!opF.email||!opF.pumpId)return;const no={id:"OP"+rid(),ownerId:owner.id,pumpId:opF.pumpId,name:opF.name,email:opF.email,password:opF.password,phone:opF.phone,shift:opF.shift,nozzles:opF.nozzles.split(",").map(s=>s.trim()).filter(Boolean),salary:parseInt(opF.salary)||0,present:true};setDb(d=>({...d,operators:[...d.operators,no]}));flash("✓ Operator added: "+opF.name);setOpF({name:"",email:"",phone:"",password:"",shift:"Morning",pumpId:"",nozzles:"",salary:""});setShowAO(false);}} style={{...G.btn,background:C.green,color:"#000",fontWeight:700}}>Add Operator →</button>
            </div>
          </div>}
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14}}>Managers</div>
          <div style={G.card}>
            <Tbl heads={["Name","Email","Pump","Shift","Salary","Status","Remove"]}>
              {myMgr.length===0?<tr><td colSpan={7} style={{...G.td,textAlign:"center",color:C.muted}}>No managers yet</td></tr>:myMgr.map(m=>{
                const pump=myPumpsColored.find(p=>p.id===m.pumpId);
                return <tr key={m.id}>
                  <td style={{...G.td,fontWeight:600}}>{m.name}</td>
                  <td style={{...G.td,color:C.muted3,fontSize:10}}>{m.email}</td>
                  <td style={{...G.td,color:pump?._color||C.muted3,fontSize:10}}>{pump?.shortName||"—"}</td>
                  <td style={G.td}>{m.shift}</td>
                  <td style={G.td}>{fmt(m.salary||0)}</td>
                  <td style={G.td}><Sb s={m.status}/></td>
                  <td style={G.td}><button onClick={()=>{setDb(d=>({...d,managers:d.managers.filter(x=>x.id!==m.id)}));flash("Manager removed");}} style={{...G.btn,background:C.redDim,color:C.red,border:`1px solid rgba(244,63,94,.3)`,padding:"4px 9px",fontSize:10}}>Remove</button></td>
                </tr>;
              })}
            </Tbl>
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14}}>Operators</div>
          <div style={G.card}>
            <Tbl heads={["Name","Email","Pump","Shift","Nozzles","Salary","Status","Remove"]}>
              {myOp.length===0?<tr><td colSpan={8} style={{...G.td,textAlign:"center",color:C.muted}}>No operators yet</td></tr>:myOp.map(o=>{
                const pump=myPumpsColored.find(p=>p.id===o.pumpId);
                return <tr key={o.id}>
                  <td style={{...G.td,fontWeight:600}}>{o.name}</td>
                  <td style={{...G.td,color:C.muted3,fontSize:10}}>{o.email}</td>
                  <td style={{...G.td,color:pump?._color||C.muted3,fontSize:10}}>{pump?.shortName||"—"}</td>
                  <td style={G.td}>{o.shift}</td>
                  <td style={{...G.td,fontSize:10}}>{(o.nozzles||[]).join(", ")||"—"}</td>
                  <td style={G.td}>{fmt(o.salary||0)}</td>
                  <td style={G.td}><Sb s="Active"/></td>
                  <td style={G.td}><button onClick={()=>{setDb(d=>({...d,operators:d.operators.filter(x=>x.id!==o.id)}));flash("Operator removed");}} style={{...G.btn,background:C.redDim,color:C.red,border:`1px solid rgba(244,63,94,.3)`,padding:"4px 9px",fontSize:10}}>Remove</button></td>
                </tr>;
              })}
            </Tbl>
          </div>
        </div>}

        {/* ── SHIFTS TAB ── */}
        {tab==="shifts"&&(()=>{
          const[shiftPdf,setShiftPdf]=useState(null);
          return <div style={{display:"flex",flexDirection:"column",gap:15}}>
          {shiftPdf&&<PDFExportModal type={"Shift Report — "+shiftPdf.shift+" "+shiftPdf.date} data={buildShiftPDF(shiftPdf,(db.nozzleReadings||[]).filter(r=>r.pumpId===shiftPdf.pumpId&&r.date===shiftPdf.date&&r.shift===shiftPdf.shift),myPumps)} onClose={()=>setShiftPdf(null)}/>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>📋 Shift Reports</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{fontSize:10,color:C.muted3}}>{myShifts.length} total shifts across {myPumps.length} pump{myPumps.length!==1?"s":""}</div>
            </div>
          </div>
          {/* Pump pills for quick filter */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div onClick={()=>setActivePump(null)} style={{padding:"5px 12px",borderRadius:8,cursor:"pointer",border:`1px solid ${activePump===null?C.accent:C.border}`,background:activePump===null?C.accentDim:"transparent",color:activePump===null?C.accent:C.muted3,fontSize:10,fontWeight:700}}>📊 All Pumps</div>
            {myPumpsColored.map(p=><PumpPill key={p.id} pump={p} active={activePump===p.id} onClick={()=>setActivePump(p.id)} compact/>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            <Kpi label="Total Shifts" value={pumpShifts.length} accent={C.blue} icon="📋"/>
            <Kpi label="Total Sales" value={fmtL(pumpShifts.reduce((s,r)=>s+(r.totalSales||0),0))} accent={C.accent} icon="💰"/>
            <Kpi label="Shifts Today" value={pumpShifts.filter(r=>r.date===todayS()).length} accent={C.green} icon="📅"/>
            <Kpi label="Avg/Shift" value={pumpShifts.length?fmtL(pumpShifts.reduce((s,r)=>s+(r.totalSales||0),0)/pumpShifts.length):"—"} accent={C.purple} icon="📊"/>
          </div>
          <ShiftReportFilter
            reports={pumpShifts}
            nozzleReadings={db.nozzleReadings||[]}
            nozzles={pumpNozzles}
            showPump={!activePump}
            pumps={myPumpsColored}
          />
        </div>;
        })()
        }

        {/* ── GST TAB ── */}
        {tab==="gst"&&(()=>{
          const[gstPdf,setGstPdf]=useState(false);
          const period="February 2025";
          const gstSales=mySales.filter(s=>s.ownerId===owner.id);
          return <div style={{display:"flex",flexDirection:"column",gap:15}}>
          {gstPdf&&<PDFExportModal type="GST Report" data={buildGSTPDF(gstSales,myPumps,owner,period)} onClose={()=>setGstPdf(false)}/>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>🧾 GST Reports</div><div style={{display:"flex",gap:8}}><button onClick={()=>setGstPdf(true)} style={{...G.btn,background:C.blue,color:"#fff",padding:"7px 13px"}}>📄 Export GST PDF</button></div></div>
          {/* Pump selector for GST */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div onClick={()=>setActivePump(null)} style={{padding:"5px 12px",borderRadius:8,cursor:"pointer",border:`1px solid ${activePump===null?C.accent:C.border}`,background:activePump===null?C.accentDim:"transparent",color:activePump===null?C.accent:C.muted3,fontSize:10,fontWeight:700}}>All Pumps (Consolidated)</div>
            {myPumpsColored.map(p=><PumpPill key={p.id} pump={p} active={activePump===p.id} onClick={()=>setActivePump(p.id)} compact/>)}
          </div>
          {(()=>{
            const filtSales=activePump?mySales.filter(s=>s.pumpId===activePump):mySales.filter(s=>s.ownerId===owner.id);
            const pump=activePump?myPumpsColored.find(p=>p.id===activePump):null;
            return <div style={{...G.card,padding:19}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
                {[["GSTIN",owner.gst||"Not configured"],["Business",pump?pump.name:owner.name],["Period","February 2025"],["Pump",pump?pump.shortName:"All Pumps Combined"]].map(([k,v])=>(
                  <div key={k} style={{background:C.s2,borderRadius:8,padding:"10px 13px"}}><div style={{fontSize:8,color:C.muted,marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>{k}</div><div style={{fontSize:13,fontWeight:700,color:(!owner.gst&&k==="GSTIN")?C.red:C.text}}>{v}</div></div>
                ))}
              </div>
              <Tbl heads={["HSN","Fuel","Pump","Quantity","Taxable","CGST 9%","SGST 9%","Total GST","Gross"]}>
                {(activePump?[activePump]:myPumps.map(p=>p.id)).flatMap(pid=>{
                  const pName=myPumpsColored.find(p=>p.id===pid)?.shortName||pid;
                  return ["Petrol","Diesel","CNG"].map(f=>{
                    const grossRev=filtSales.filter(s=>s.pumpId===pid).reduce((s,d)=>s+(d[f.toLowerCase()]||0),0);
                    if(grossRev===0)return null;
                    const testQty=(db.machineTests||[]).filter(t=>t.fuel===f&&t.pumpId===pid).reduce((s,t)=>s+t.qty,0);
                    const testDeduction=Math.round(testQty*FUEL.rates[f]);
                    const rev=Math.max(0,grossRev-testDeduction);
                    const taxable=Math.round(rev/1.18),cgst=Math.round(taxable*.09);
                    return <tr key={pid+f}><td style={{...G.td,fontFamily:"monospace",color:C.muted3,fontSize:10}}>{FUEL.hsn[f]}{testDeduction>0&&<div style={{fontSize:8,color:C.teal}}>-{fmt(testDeduction)} test</div>}</td><td style={G.td}><span style={{...G.badge,background:FUEL.colors[f]+"18",color:FUEL.colors[f]}}>{f}</span></td><td style={{...G.td,fontSize:10,color:C.muted3}}>{activePump?"—":pName}</td><td style={G.td}>{fmtN(Math.round(rev/FUEL.rates[f]))} {f==="CNG"?"kg":"L"}</td><td style={{...G.td,fontWeight:600}}>{fmt(taxable)}</td><td style={G.td}>{fmt(cgst)}</td><td style={G.td}>{fmt(cgst)}</td><td style={{...G.td,fontWeight:700,color:C.blue}}>{fmt(cgst*2)}</td><td style={{...G.td,fontWeight:800,color:C.accent}}>{fmtL(rev)}</td></tr>;
                  }).filter(Boolean);
                })}
              </Tbl>
            </div>;
          })()}
        </div>;
        })()
        }

        {/* ── SETTINGS TAB ── */}
        {tab==="settings"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>⚙️ Settings</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
            <div style={{...G.card,padding:18}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:14}}>🔔 WhatsApp Notifications</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:11,color:C.muted3}}>Enable WhatsApp Alerts</span><Toggle on={waF.enabled} onChange={()=>setWaF(f=>({...f,enabled:!f.enabled}))}/></div>
              {waF.enabled&&<div style={{marginBottom:14}}><label style={G.label}>WhatsApp Number</label><input style={G.input} value={waF.number} onChange={e=>setWaF(f=>({...f,number:e.target.value}))} placeholder="+91 98765 43210"/></div>}
              <button onClick={()=>{setDb(d=>({...d,owners:d.owners.map(o=>o.id===owner.id?{...o,whatsapp:waF.enabled,whatsappNum:waF.number}:o)}));flash("✓ WhatsApp settings saved");}} style={{...G.btn,background:C.green,color:"#000",fontWeight:700}}>Save</button>
            </div>
            <div style={{...G.card,padding:18}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:14}}>🔒 Change Password</div>
              {["old","n1","n2"].map((k,i)=><div key={k} style={{marginBottom:12}}><label style={G.label}>{["Current","New Password","Confirm New"][i]}</label><input type="password" value={passF[k]} onChange={e=>setPassF(f=>({...f,[k]:e.target.value}))} style={G.input}/></div>)}
              <button onClick={()=>{if(passF.old!==owner.password){flash("⚠ Current password wrong");return;}if(passF.n1!==passF.n2){flash("⚠ Passwords don't match");return;}setDb(d=>({...d,owners:d.owners.map(o=>o.id===owner.id?{...o,password:passF.n1}:o)}));setOwner(o=>({...o,password:passF.n1}));flash("✓ Password changed");setPassF({old:"",n1:"",n2:""});}} style={{...G.btn,background:C.blue,color:"#fff",fontWeight:700}}>Update Password</button>
            </div>
          </div>
        </div>}

        {/* ── NEW v7: ANALYTICS (enhanced) ── */}

        {/* ── NEW v7: FUEL PRICES ── */}
        {tab==="prices"&&<FuelPriceManager db={db} setDb={setDb} ownerId={owner.id} flash={flash}/>}

        {/* ── NEW v7: INDENT ORDERS ── */}
        {tab==="indent"&&<IndentSystem db={db} setDb={setDb} ownerId={owner.id} flash={flash}/>}

        {/* ── NEW v7: SHIFT AUDIT ── */}
        {tab==="audit"&&<ShiftAuditPanel db={db} setDb={setDb} ownerId={owner.id} flash={flash}/>}

        {/* ── NEW v7: NOTIFICATIONS ── */}
        {tab==="notifications"&&<NotificationCentre db={db} setDb={setDb} owner={owner} flash={flash}/>}

      </div>
    </div>
  </div>;
};

// ═══════════════════════════════════════════════════════════
// SHIFT OPERATIONS MODULE — used by Manager & Operator
// ═══════════════════════════════════════════════════════════
// NozzleReadingRow: single nozzle entry card
const NozzleReadingRow=({nozzle,openReading,closeVal,onClose,testVol,readOnly=false,compact=false})=>{
  const close=parseFloat(closeVal||"");
  const rawVol=!isNaN(close)&&close>openReading?close-openReading:null;
  const saleVol=rawVol!==null?Math.max(0,rawVol-testVol):null;
  const revenue=saleVol!==null?saleVol*FUEL.rates[nozzle.fuel]:null;
  const fc=FUEL.colors[nozzle.fuel];
  if(compact) return(
    <div style={{...G.card,padding:"11px 14px",display:"flex",gap:12,alignItems:"center"}}>
      <div style={{background:fc+"18",borderRadius:8,padding:"6px 10px",minWidth:54,textAlign:"center"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:fc}}>{nozzle.id}</div>
        <div style={{fontSize:8,color:C.muted3}}>{nozzle.fuel}</div>
      </div>
      <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        <div><div style={{fontSize:8,color:C.muted3}}>Open</div><div style={{fontFamily:"monospace",fontSize:11,fontWeight:600}}>{fmtN(openReading)}</div></div>
        <div>
          <div style={{fontSize:8,color:C.muted3}}>Close</div>
          {readOnly?<div style={{fontFamily:"monospace",fontSize:11,fontWeight:600,color:C.green}}>{closeVal||"—"}</div>
          :<input type="number" step="0.01" value={closeVal||""} onChange={e=>onClose(e.target.value)} style={{...G.input,padding:"5px 8px",fontSize:11}} onFocus={e=>e.target.style.borderColor=fc} onBlur={e=>e.target.style.borderColor=C.border}/>}
        </div>
        <div><div style={{fontSize:8,color:C.muted3}}>Sale Vol</div><div style={{fontSize:11,fontWeight:700,color:saleVol!==null?C.green:C.muted}}>{saleVol!==null?saleVol.toFixed(2)+"L":"—"}</div></div>
      </div>
      <div style={{textAlign:"right",minWidth:80}}>
        <div style={{fontSize:8,color:C.muted3}}>Revenue</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:C.accent}}>{revenue!==null?fmt(Math.round(revenue)):"—"}</div>
      </div>
    </div>
  );
  return(
    <div style={{...G.card,padding:17,borderLeft:`3px solid ${fc}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,color:fc}}>{nozzle.id}</div>
          <span style={{...G.badge,background:fc+"18",color:fc}}>{nozzle.fuel}</span>
          {testVol>0&&<span style={{...G.badge,background:C.tealDim,color:C.teal}}>🔬 {testVol}L excl.</span>}
        </div>
        <Sb s={nozzle.status}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <div>
          <label style={G.label}>Open Reading (Auto)</label>
          <div style={{...G.input,opacity:.75,fontFamily:"monospace",color:C.muted2,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:9,color:C.muted}}>🔒</span>{fmtN(openReading)}
          </div>
        </div>
        <div>
          <label style={G.label}>Close Reading</label>
          {readOnly
            ?<div style={{...G.input,fontFamily:"monospace",color:C.green,fontWeight:700}}>{closeVal||"—"}</div>
            :<input type="number" step="0.01" value={closeVal||""} onChange={e=>onClose(e.target.value)}
              placeholder="Enter close..."
              style={G.input}
              onFocus={e=>e.target.style.borderColor=fc}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          }
        </div>
        <div>
          <label style={G.label}>Net Volume Sold</label>
          <div style={{...G.input,opacity:.75,fontFamily:"monospace",color:saleVol!==null&&saleVol>0?C.green:C.muted}}>
            {saleVol!==null&&saleVol>=0?saleVol.toFixed(3)+"L":"—"}
          </div>
        </div>
        <div>
          <label style={G.label}>Gross Revenue</label>
          <div style={{...G.input,opacity:.75,fontFamily:"'Syne',sans-serif",fontWeight:800,color:C.accent}}>
            {revenue!==null?fmt(Math.round(revenue)):"—"}
          </div>
        </div>
      </div>
      {rawVol!==null&&testVol>0&&<div style={{marginTop:9,background:C.tealDim,borderRadius:8,padding:"7px 12px",fontSize:10,color:C.teal}}>
        Gross dispensed: {rawVol.toFixed(3)}L — Test qty: {testVol.toFixed(3)}L = Net sale: {saleVol?.toFixed(3)}L
      </div>}
    </div>
  );
};

// ShiftReportCard: read-only view of a submitted shift
const ShiftReportCard=({report,nozzleReadings,nozzles,expanded,onToggle})=>{
  const shift=SHIFTS.find(s=>s.name===report.shift)||SHIFTS[0];
  const myReadings=nozzleReadings.filter(nr=>report.readings?.includes(nr.id)||(!report.readings&&nr.pumpId===report.pumpId&&nr.date===report.date&&nr.shift===report.shift));
  const petrolRev=myReadings.filter(nr=>nr.fuel==="Petrol").reduce((s,nr)=>s+nr.revenue,0);
  const dieselRev=myReadings.filter(nr=>nr.fuel==="Diesel").reduce((s,nr)=>s+nr.revenue,0);
  const cngRev=myReadings.filter(nr=>nr.fuel==="CNG").reduce((s,nr)=>s+nr.revenue,0);
  return(
    <div style={{...G.card,overflow:"visible"}}>
      <div onClick={onToggle} style={{padding:"14px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:expanded?`1px solid ${C.border}`:"none"}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:18}}>{shift.icon}</span>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>{report.date} · {report.shift} Shift</div>
            <div style={{fontSize:9,color:C.muted3,marginTop:1}}>{report.manager||"—"} · {myReadings.length} nozzle{myReadings.length!==1?"s":""}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:C.accent}}>{fmt(report.totalSales||0)}</div>
            <div style={{fontSize:9,color:report.variance===0?C.green:Math.abs(report.variance||0)<300?C.warn:C.red}}>{report.variance===0||!report.variance?"✓ Balanced":(report.variance>0?"+":"")+fmt(report.variance)}</div>
          </div>
          <Sb s={report.status}/>
          <span style={{color:C.muted,fontSize:12}}>{expanded?"▲":"▼"}</span>
        </div>
      </div>
      {expanded&&<div style={{padding:"14px 18px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          {[[`💰 ${fmt(report.cash||0)}`,"Cash",C.green],[`💳 ${fmt(report.card||0)}`,"Card",C.blue],[`📱 ${fmt(report.upi||0)}`,"UPI",C.purple],[`⚖ ${fmt(Math.abs(report.variance||0))}`,(report.variance||0)>0?"Over":(report.variance||0)<0?"Short":"Balanced",report.variance===0||!report.variance?C.green:C.red]].map(([v,l,c])=>
            <div key={l} style={{background:C.s2,borderRadius:9,padding:"10px 12px"}}><div style={{fontSize:9,color:C.muted3}}>{l}</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:c}}>{v}</div></div>
          )}
        </div>
        {/* Fuel breakdown */}
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          {[["Petrol",petrolRev,C.blue],["Diesel",dieselRev,C.accent],["CNG",cngRev,C.green]].filter(([,v])=>v>0).map(([f,v,c])=>
            <div key={f} style={{background:c+"12",border:`1px solid ${c}28`,borderRadius:8,padding:"8px 12px",flex:1}}>
              <div style={{fontSize:9,color:c}}>{f}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:c}}>{fmt(Math.round(v))}</div>
            </div>
          )}
        </div>
        {/* Nozzle reading table */}
        {myReadings.length>0&&<div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Nozzle","Fuel","Open Reading","Close Reading","Test Vol","Net Vol","Rate","Revenue"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead>
            <tbody>{myReadings.map(nr=><tr key={nr.id}>
              <td style={{...G.td,fontWeight:700,color:FUEL.colors[nr.fuel]}}>{nr.nozzleId}</td>
              <td style={G.td}><span style={{...G.badge,background:FUEL.colors[nr.fuel]+"18",color:FUEL.colors[nr.fuel]}}>{nr.fuel}</span></td>
              <td style={{...G.td,fontFamily:"monospace"}}>{fmtN(nr.openReading)}</td>
              <td style={{...G.td,fontFamily:"monospace",color:C.green,fontWeight:600}}>{fmtN(nr.closeReading)}</td>
              <td style={{...G.td,color:nr.testVol>0?C.teal:C.muted}}>{nr.testVol>0?nr.testVol.toFixed(3)+"L":"—"}</td>
              <td style={{...G.td,color:C.green,fontWeight:600}}>{nr.saleVol.toFixed(3)}L</td>
              <td style={{...G.td,color:C.muted3}}>₹{nr.rate}</td>
              <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmt(Math.round(nr.revenue))}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>}
    </div>
  );
};

// ShiftReportFilter: filterable table of shift reports
const ShiftReportFilter=({reports,nozzleReadings,nozzles,title,showPump=false,pumps=[]})=>{
  const[filterPump,setFilterPump]=useState("all");
  const[filterShift,setFilterShift]=useState("all");
  const[filterDate,setFilterDate]=useState("");
  const[expanded,setExpanded]=useState(null);
  const[sortBy,setSortBy]=useState("date");
  const[sortDir,setSortDir]=useState("desc");
  const filtered=reports.filter(r=>{
    if(filterPump!=="all"&&r.pumpId!==filterPump)return false;
    if(filterShift!=="all"&&r.shift!==filterShift)return false;
    if(filterDate&&r.date!==filterDate)return false;
    return true;
  }).sort((a,b)=>{
    let av=a[sortBy],bv=b[sortBy];
    if(sortBy==="date"){av=a.date+(SHIFTS.findIndex(s=>s.name===a.shift)||0);bv=b.date+(SHIFTS.findIndex(s=>s.name===b.shift)||0);}
    if(sortBy==="totalSales"){av=a.totalSales||0;bv=b.totalSales||0;}
    const cmp=typeof av==="string"?av.localeCompare(bv):av-bv;
    return sortDir==="asc"?cmp:-cmp;
  });
  const totalSales=filtered.reduce((s,r)=>s+(r.totalSales||0),0);
  const totalVariance=filtered.reduce((s,r)=>s+(r.variance||0),0);
  const sortTh=(col,label)=>(
    <th style={{...G.th,cursor:"pointer",userSelect:"none"}} onClick={()=>{if(sortBy===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortBy(col);setSortDir("desc");}}}>
      {label} {sortBy===col?(sortDir==="asc"?"↑":"↓"):""}
    </th>
  );
  return(<div style={{display:"flex",flexDirection:"column",gap:13}}>
    {title&&<div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14}}>{title}</div>}
    {/* Filters row */}
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      {showPump&&<select value={filterPump} onChange={e=>setFilterPump(e.target.value)} style={{...G.input,width:"auto",padding:"6px 10px",fontSize:11}}>
        <option value="all">All Pumps</option>
        {pumps.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}
      </select>}
      <select value={filterShift} onChange={e=>setFilterShift(e.target.value)} style={{...G.input,width:"auto",padding:"6px 10px",fontSize:11}}>
        <option value="all">All Shifts</option>
        {SHIFTS.map(s=><option key={s.name} value={s.name}>{s.icon} {s.name}</option>)}
      </select>
      <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{...G.input,width:"auto",padding:"6px 10px",fontSize:11}}/>
      {(filterPump!=="all"||filterShift!=="all"||filterDate)&&<button onClick={()=>{setFilterPump("all");setFilterShift("all");setFilterDate("");}} style={{...G.btn,background:C.s3,color:C.muted2,border:`1px solid ${C.border}`,padding:"5px 10px",fontSize:10}}>✕ Clear</button>}
      <div style={{marginLeft:"auto",display:"flex",gap:10,fontSize:10,color:C.muted3}}>
        <span><strong style={{color:C.accent}}>{fmt(totalSales)}</strong> total</span>
        <span><strong style={{color:filtered.length>0?"":C.muted}}>{filtered.length}</strong> reports</span>
        {totalVariance!==0&&<span><strong style={{color:Math.abs(totalVariance)<1000?C.warn:C.red}}>{totalVariance>0?"+":""}{fmt(totalVariance)}</strong> variance</span>}
      </div>
    </div>
    {/* Responsive table (card on mobile, table on desktop) */}
    <div style={{display:"none"}} className="mobile-cards">
      {filtered.map(r=><ShiftReportCard key={r.id} report={r} nozzleReadings={nozzleReadings} nozzles={nozzles} expanded={expanded===r.id} onToggle={()=>setExpanded(expanded===r.id?null:r.id)}/>)}
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
        <thead><tr>
          {showPump&&<th style={G.th}>Pump</th>}
          {sortTh("date","Date")}
          <th style={G.th}>Shift</th>
          <th style={G.th}>Manager</th>
          {sortTh("totalSales","Sales")}
          <th style={G.th}>Cash</th>
          <th style={G.th}>Card</th>
          <th style={G.th}>UPI</th>
          <th style={G.th}>Nozzles</th>
          <th style={G.th}>Variance</th>
          <th style={G.th}>Status</th>
          <th style={G.th}>Detail</th>
        </tr></thead>
        <tbody>
          {filtered.map(r=>{
            const shift=SHIFTS.find(s=>s.name===r.shift)||SHIFTS[0];
            const pump=pumps.find(p=>p.id===r.pumpId);
            const isExp=expanded===r.id;
            const myR=nozzleReadings.filter(nr=>r.readings?.includes(nr.id)||(!r.readings&&nr.pumpId===r.pumpId&&nr.date===r.date&&nr.shift===r.shift));
            const petrolRev=myR.filter(nr=>nr.fuel==="Petrol").reduce((s,nr)=>s+nr.revenue,0);
            const dieselRev=myR.filter(nr=>nr.fuel==="Diesel").reduce((s,nr)=>s+nr.revenue,0);
            const cngRev=myR.filter(nr=>nr.fuel==="CNG").reduce((s,nr)=>s+nr.revenue,0);
            return [
              <tr key={r.id} style={{background:isExp?C.s2:"",cursor:"pointer"}} onClick={()=>setExpanded(isExp?null:r.id)}>
                {showPump&&<td style={G.td}><span style={{fontSize:10,color:C.muted3}}>{pump?.shortName||r.pumpId}</span></td>}
                <td style={{...G.td,color:C.muted3,fontFamily:"monospace",fontSize:11}}>{r.date}</td>
                <td style={G.td}><span style={{...G.badge,background:shift.color+"18",color:shift.color}}>{shift.icon} {r.shift}</span></td>
                <td style={{...G.td,fontSize:11}}>{r.manager||"—"}</td>
                <td style={{...G.td,fontFamily:"'Syne',sans-serif",fontWeight:800,color:C.accent}}>{fmt(r.totalSales||0)}</td>
                <td style={{...G.td,color:C.green,fontSize:11}}>{fmt(r.cash||0)}</td>
                <td style={{...G.td,color:C.blue,fontSize:11}}>{fmt(r.card||0)}</td>
                <td style={{...G.td,color:C.purple,fontSize:11}}>{fmt(r.upi||0)}</td>
                <td style={{...G.td,color:C.muted3,fontSize:11}}>{r.nozzleCount||myR.length}</td>
                <td style={{...G.td,fontWeight:700,color:(r.variance||0)===0?C.green:Math.abs(r.variance||0)<300?C.warn:C.red}}>{(r.variance||0)===0?"✓":((r.variance||0)>0?"+":"")+fmt(r.variance||0)}</td>
                <td style={G.td}><Sb s={r.status}/></td>
                <td style={G.td}><span style={{color:C.muted,fontSize:11}}>{isExp?"▲":"▼"}</span></td>
              </tr>,
              isExp&&<tr key={r.id+"-exp"}>
                <td colSpan={showPump?12:11} style={{padding:"0 18px 16px",background:C.s2}}>
                  <div style={{marginTop:12}}>
                    <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                      {[["Petrol",petrolRev,C.blue],["Diesel",dieselRev,C.accent],["CNG",cngRev,C.green]].filter(([,v])=>v>0).map(([f,v,c])=>
                        <div key={f} style={{background:c+"12",border:`1px solid ${c}28`,borderRadius:8,padding:"7px 12px",minWidth:100}}>
                          <div style={{fontSize:9,color:c}}>{f}</div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,color:c}}>{fmt(Math.round(v))}</div>
                        </div>
                      )}
                    </div>
                    {myR.length>0&&<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr>{["Nozzle","Fuel","Open","Close","Test Vol","Net Vol","Revenue"].map(h=><th key={h} style={{...G.th,fontSize:8,padding:"7px 10px"}}>{h}</th>)}</tr></thead>
                      <tbody>{myR.map(nr=><tr key={nr.id}>
                        <td style={{...G.td,padding:"8px 10px",fontWeight:700,color:FUEL.colors[nr.fuel]}}>{nr.nozzleId}</td>
                        <td style={{...G.td,padding:"8px 10px"}}><span style={{...G.badge,background:FUEL.colors[nr.fuel]+"18",color:FUEL.colors[nr.fuel],fontSize:8}}>{nr.fuel}</span></td>
                        <td style={{...G.td,padding:"8px 10px",fontFamily:"monospace"}}>{fmtN(nr.openReading)}</td>
                        <td style={{...G.td,padding:"8px 10px",fontFamily:"monospace",color:C.green,fontWeight:600}}>{fmtN(nr.closeReading)}</td>
                        <td style={{...G.td,padding:"8px 10px",color:nr.testVol>0?C.teal:C.muted}}>{nr.testVol>0?nr.testVol.toFixed(2)+"L":"—"}</td>
                        <td style={{...G.td,padding:"8px 10px",color:C.green,fontWeight:600}}>{nr.saleVol.toFixed(3)}L</td>
                        <td style={{...G.td,padding:"8px 10px",fontWeight:700,color:C.accent}}>{fmt(Math.round(nr.revenue))}</td>
                      </tr>)}</tbody>
                    </table>}
                  </div>
                </td>
              </tr>
            ];
          })}
          {filtered.length===0&&<tr><td colSpan={12} style={{...G.td,textAlign:"center",color:C.muted,padding:30}}>No shift reports found</td></tr>}
        </tbody>
        {filtered.length>1&&<tfoot>
          <tr style={{background:C.s2}}>
            {showPump&&<td style={{...G.td,fontSize:10,color:C.muted}}>Total ({filtered.length})</td>}
            <td colSpan={showPump?3:3} style={{...G.td,fontSize:10,color:C.muted}}>Total ({filtered.length} shifts)</td>
            <td style={{...G.td,fontFamily:"'Syne',sans-serif",fontWeight:800,color:C.accent}}>{fmt(totalSales)}</td>
            <td style={{...G.td,color:C.green,fontWeight:700}}>{fmt(filtered.reduce((s,r)=>s+(r.cash||0),0))}</td>
            <td style={{...G.td,color:C.blue,fontWeight:700}}>{fmt(filtered.reduce((s,r)=>s+(r.card||0),0))}</td>
            <td style={{...G.td,color:C.purple,fontWeight:700}}>{fmt(filtered.reduce((s,r)=>s+(r.upi||0),0))}</td>
            <td colSpan={2} style={{...G.td,color:C.muted3,fontSize:10}}>{filtered.reduce((s,r)=>s+(r.nozzleCount||0),0)} nozzle entries</td>
            <td style={{...G.td,fontWeight:700,color:totalVariance===0?C.green:Math.abs(totalVariance)<500?C.warn:C.red}}>{totalVariance===0?"✓":(totalVariance>0?"+":"")+fmt(totalVariance)}</td>
            <td colSpan={2}/>
          </tr>
        </tfoot>}
      </table>
    </div>
  </div>);
};

// ═══════════════════════════════════════════════════════════
// MANAGER DASHBOARD — Full shift-wise operations
// ═══════════════════════════════════════════════════════════
const ManagerDash=({manager,db,setDb,onLogout})=>{
  const[tab,setTab]=useState("operations");
  const[msg,setMsg]=useState("");
  const flash=t=>{setMsg(t);setTimeout(()=>setMsg(""),4000);};
  const owner=db.owners.find(o=>o.id===manager.ownerId);
  const myPump=db.pumps.find(p=>p.id===manager.pumpId);
  const myNozzles=db.nozzles.filter(n=>n.pumpId===manager.pumpId);
  const myOps=db.operators.filter(o=>o.pumpId===manager.pumpId);
  const myTanks=db.tanks.filter(t=>t.pumpId===manager.pumpId);
  const myShifts=db.shiftReports.filter(r=>r.pumpId===manager.pumpId);
  const myTests=(db.machineTests||[]).filter(t=>t.pumpId===manager.pumpId);

  // Active shift selection
  const[activeShift,setActiveShift]=useState(getCurrentShift());
  const[activeDate,setActiveDate]=useState(todayS());

  const alreadySubmitted=isShiftSubmitted(db,manager.pumpId,activeDate,activeShift.name);

  // Nozzle close readings for active shift (keyed by pumpId+nozzleId)
  const[closeF,setCloseF]=useState({});
  // Payment breakdown per nozzle
  const[cashF,setCashF]=useState({});
  // Denomination
  const DENOMS=[2000,500,200,100,50,20,10,5,2,1];
  const[denomF,setDenomF]=useState(Object.fromEntries(DENOMS.map(d=>[d,""])));
  const denomTotal=DENOMS.reduce((s,d)=>s+(parseInt(denomF[d])||0)*d,0);
  // Dip readings
  const[dipF,setDipF]=useState({});
  // Show test form
  const[showTestForm,setShowTestForm]=useState(false);

  // Reset close readings when shift changes
  useEffect(()=>{setCloseF({});setCashF({});}, [activeShift.name,activeDate]);

  // Compute open reading for each nozzle for current active shift
  const nozzleOpenReadings=useMemo(()=>{
    const map={};
    myNozzles.forEach(n=>{
      map[n.pumpId+n.id]=getNozzleOpenForShift(db,n.pumpId,n.id,activeDate,activeShift.name);
    });
    return map;
  },[myNozzles,db.nozzleReadings,activeDate,activeShift.name]);

  // Get test qty for active date+shift+nozzle
  const getTestVol=(nozzleId)=>{
    return myTests.filter(t=>t.nozzleId===nozzleId&&t.pumpId===manager.pumpId&&t.date===activeDate&&t.shift===activeShift.name).reduce((s,t)=>s+t.qty,0);
  };

  // Computed totals
  const nozzleCalcs=useMemo(()=>{
    return myNozzles.map(n=>{
      const key=n.pumpId+n.id;
      const openR=nozzleOpenReadings[key]??n.open;
      const closeR=parseFloat(closeF[key]||"");
      const rawVol=!isNaN(closeR)&&closeR>openR?closeR-openR:null;
      const testVol=getTestVol(n.id);
      const saleVol=rawVol!==null?Math.max(0,rawVol-testVol):null;
      const revenue=saleVol!==null?saleVol*FUEL.rates[n.fuel]:null;
      const cf=cashF[key]||{cash:"",card:"",upi:"",credit:""};
      const collected=(parseFloat(cf.cash)||0)+(parseFloat(cf.card)||0)+(parseFloat(cf.upi)||0);
      const nVariance=revenue!==null&&collected>0?collected-Math.round(revenue):null;
      return{nozzle:n,key,openR,closeR,rawVol,testVol,saleVol,revenue,collected,nVariance};
    });
  },[myNozzles,closeF,cashF,nozzleOpenReadings,activeDate,activeShift.name,myTests]);

  const totalSales=nozzleCalcs.reduce((s,c)=>s+(c.revenue||0),0);
  const totalCollected=nozzleCalcs.reduce((s,c)=>s+c.collected,0);
  const totalVariance=Math.round(totalCollected-totalSales);
  const allCloseFilled=myNozzles.every(n=>closeF[n.pumpId+n.id]);
  const todayTests=myTests.filter(t=>t.date===todayS());
  const pendingTests=myNozzles.filter(n=>getNozzleTestStatus(myTests,n.id,manager.pumpId,todayS())==="pending").length;

  const submitShift=()=>{
    if(!allCloseFilled){flash("⚠ Please enter close readings for all nozzles");return;}
    const newNozzleReadings=nozzleCalcs.map(c=>({
      id:`NR-${manager.pumpId}-${c.nozzle.id}-${activeDate}-${activeShift.name}-${rid()}`,
      ownerId:manager.ownerId,pumpId:manager.pumpId,nozzleId:c.nozzle.id,fuel:c.nozzle.fuel,
      date:activeDate,shift:activeShift.name,shiftIndex:activeShift.index,
      openReading:Math.round(c.openR*100)/100,
      closeReading:Math.round(c.closeR*100)/100,
      testVol:c.testVol,netVol:c.saleVol||0,saleVol:c.saleVol||0,
      revenue:c.revenue||0,rate:FUEL.rates[c.nozzle.fuel],
      operator:c.nozzle.operator||"",
      status:"Submitted",
    }));

    const nrIds=newNozzleReadings.map(nr=>nr.id);
    const cashSum=nozzleCalcs.reduce((s,c)=>s+(parseFloat(cashF[c.key]?.cash)||0),0);
    const cardSum=nozzleCalcs.reduce((s,c)=>s+(parseFloat(cashF[c.key]?.card)||0),0);
    const upiSum=nozzleCalcs.reduce((s,c)=>s+(parseFloat(cashF[c.key]?.upi)||0),0);
    const creditSum=nozzleCalcs.reduce((s,c)=>s+(parseFloat(cashF[c.key]?.credit)||0),0);

    const shiftReport={
      id:`SR-${manager.pumpId}-${activeDate}-${activeShift.name}-${rid()}`,
      ownerId:manager.ownerId,pumpId:manager.pumpId,date:activeDate,
      shift:activeShift.name,shiftIndex:activeShift.index,
      manager:manager.name,status:"Submitted",
      totalSales:Math.round(totalSales),
      cash:Math.round(cashSum),card:Math.round(cardSum),
      upi:Math.round(upiSum),creditOut:Math.round(creditSum),
      variance:totalVariance,denomTotal,
      nozzleCount:myNozzles.length,
      readings:nrIds,
    };

    // Update nozzle open readings to close readings (for next shift auto-population)
    const updatedNozzles=db.nozzles.map(n=>{
      const match=nozzleCalcs.find(c=>c.nozzle.id===n.id&&n.pumpId===manager.pumpId);
      if(!match||isNaN(match.closeR))return n;
      return{...n,open:match.closeR,close:""};
    });

    // Update sales
    const newSales={date:activeDate,pumpId:manager.pumpId,ownerId:manager.ownerId,
      petrol:nozzleCalcs.filter(c=>c.nozzle.fuel==="Petrol").reduce((s,c)=>s+(c.revenue||0),0),
      diesel:nozzleCalcs.filter(c=>c.nozzle.fuel==="Diesel").reduce((s,c)=>s+(c.revenue||0),0),
      cng:nozzleCalcs.filter(c=>c.nozzle.fuel==="CNG").reduce((s,c)=>s+(c.revenue||0),0),
    };
    const salesUpdated=[...db.sales.filter(s=>!(s.pumpId===manager.pumpId&&s.date===activeDate)),
      {...(db.sales.find(s=>s.pumpId===manager.pumpId&&s.date===activeDate)||{petrol:0,diesel:0,cng:0}),...newSales,
        petrol:(db.sales.find(s=>s.pumpId===manager.pumpId&&s.date===activeDate)?.petrol||0)+newSales.petrol,
        diesel:(db.sales.find(s=>s.pumpId===manager.pumpId&&s.date===activeDate)?.diesel||0)+newSales.diesel,
        cng:(db.sales.find(s=>s.pumpId===manager.pumpId&&s.date===activeDate)?.cng||0)+newSales.cng,
      }];

    setDb(d=>({...d,
      nozzleReadings:[...d.nozzleReadings,...newNozzleReadings],
      shiftReports:[shiftReport,...d.shiftReports],
      nozzles:updatedNozzles,
      sales:salesUpdated,
    }));
    flash("✅ "+activeShift.name+" shift submitted! Nozzle readings rolled over.");
    setTab("history");
  };

  const NAV=[
    {k:"operations",icon:"⚙️",label:"Operations",badge:alreadySubmitted?undefined:myNozzles.length>0?"●":undefined,bc:C.accent},
    {k:"testing",icon:"🔬",label:"Machine Tests",badge:pendingTests||undefined,bc:C.teal},
    {k:"cashcoll",icon:"💰",label:"Cash & Payments"},
    {k:"denom",icon:"🪙",label:"Denomination"},
    {k:"tanks",icon:"🛢",label:"Dip & Tanks"},
    {k:"attendance",icon:"👷",label:"Attendance"},
    {k:"history",icon:"📋",label:"Shift Reports"},
  ];

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Mono',monospace",color:C.text}}>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    {showTestForm&&<MachineTestForm nozzles={myNozzles} operators={myOps} pumpId={manager.pumpId} ownerId={manager.ownerId} db={db} setDb={setDb} onClose={()=>setShowTestForm(false)} flash={flash}/>}
    <Topbar icon="🗂" ac={C.blue} label={`Manager · ${myPump?.shortName||"—"}`} pump={myPump?.name} db={null} notifs={null}
      right={<div style={{display:"flex",gap:8,alignItems:"center"}}>
        {msg&&<div style={{fontSize:11,color:C.green,background:"rgba(0,229,179,.08)",border:"1px solid rgba(0,229,179,.2)",borderRadius:7,padding:"5px 11px"}}>{msg}</div>}
        <div style={{padding:"5px 10px",background:activeShift.color+"18",borderRadius:7,fontSize:10,color:activeShift.color,border:`1px solid ${activeShift.color}30`,fontWeight:700}}>{activeShift.icon} {activeShift.name}</div>
        <button onClick={onLogout} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"6px 12px"}}>Logout</button>
      </div>}
    />
    <div style={{display:"flex"}}>
      <Sidebar items={NAV} active={tab} onNav={setTab} accent={C.blue}
        footer={<div style={{padding:"13px 15px",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Active Shift</div>
          <div style={{display:"flex",gap:7,marginBottom:8}}>
            {SHIFTS.map(s=><button key={s.name} onClick={()=>setActiveShift(s)} style={{...G.btn,flex:1,justifyContent:"center",padding:"5px 4px",fontSize:9,background:activeShift.name===s.name?s.color+"30":C.s3,color:activeShift.name===s.name?s.color:C.muted2,border:`1px solid ${activeShift.name===s.name?s.color+"50":C.border}`}}>{s.icon}</button>)}
          </div>
          <input type="date" value={activeDate} onChange={e=>setActiveDate(e.target.value)} style={{...G.input,fontSize:10,padding:"5px 8px"}}/>
          <div style={{marginTop:8,fontSize:9,color:alreadySubmitted?C.green:C.warn}}>{alreadySubmitted?"✅ Shift submitted":"⏳ Pending submission"}</div>
        </div>}
      />
      <div style={{flex:1,padding:20,overflowY:"auto",maxHeight:"calc(100vh - 62px)"}}>

        {/* ─── OPERATIONS TAB ─── */}
        {tab==="operations"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>
                {activeShift.icon} {activeShift.name} Shift — Nozzle Entry
              </div>
              <div style={{fontSize:10,color:C.muted3,marginTop:2}}>
                {myPump?.shortName} · {activeDate} · Open readings auto-populated from previous shift
              </div>
            </div>
            <div style={{display:"flex",gap:9}}>
              {alreadySubmitted&&<div style={{padding:"8px 14px",background:C.greenDim,border:`1px solid rgba(0,229,179,.3)`,borderRadius:9,fontSize:11,color:C.green,fontWeight:700}}>✅ Submitted</div>}
              {!alreadySubmitted&&<button onClick={submitShift} disabled={!allCloseFilled} style={{...G.btn,background:allCloseFilled?C.green:C.s3,color:allCloseFilled?"#000":C.muted,fontWeight:700,opacity:allCloseFilled?1:.7}}>✓ Submit {activeShift.name} Shift →</button>}
            </div>
          </div>

          {/* Previous shift continuity banner */}
          {!alreadySubmitted&&<div style={{background:C.blueDim,border:`1px solid rgba(75,141,248,.2)`,borderRadius:11,padding:"10px 16px"}}>
            <div style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:3}}>🔄 Auto-Continuity Active</div>
            <div style={{fontSize:10,color:C.muted3}}>Open readings below are auto-filled from the last submitted shift. Enter today's close readings to complete this shift.</div>
          </div>}

          {alreadySubmitted&&<div style={{background:C.greenDim,border:`1px solid rgba(0,229,179,.3)`,borderRadius:11,padding:"12px 16px"}}>
            <div style={{fontWeight:700,color:C.green,fontSize:12,marginBottom:3}}>✅ {activeShift.name} shift already submitted for {activeDate}</div>
            <div style={{fontSize:10,color:C.muted3}}>Switch to another shift or date in the sidebar, or view reports in Shift Reports tab.</div>
          </div>}

          {/* Live summary KPIs */}
          {!alreadySubmitted&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            <Kpi label="Meter Sales" value={fmtL(totalSales)} sub="estimated" accent={C.blue} icon="⛽"/>
            <Kpi label="Cash Collected" value={fmtL(totalCollected)} sub="entered" accent={C.green} icon="💰"/>
            <Kpi label="Variance" value={fmt(Math.abs(totalVariance))} sub={totalVariance>0?"Over":totalVariance<0?"Short":"Balanced"} accent={totalVariance===0?C.green:Math.abs(totalVariance)<500?C.warn:C.red} icon="⚖️"/>
            <Kpi label="Nozzles Ready" value={`${nozzleCalcs.filter(c=>c.closeR&&!isNaN(c.closeR)).length}/${myNozzles.length}`} sub={allCloseFilled?"All filled":"Pending entry"} accent={allCloseFilled?C.green:C.warn} icon="✅"/>
          </div>}

          {/* Nozzle entry cards */}
          {myNozzles.map(n=>{
            const key=n.pumpId+n.id;
            const openR=nozzleOpenReadings[key]??n.open;
            const testVol=getTestVol(n.id);
            return <NozzleReadingRow key={key}
              nozzle={n} openReading={openR}
              closeVal={closeF[key]||""}
              onClose={v=>setCloseF(f=>({...f,[key]:v}))}
              testVol={testVol}
              readOnly={alreadySubmitted}
            />;
          })}

          {/* Compact summary table */}
          {nozzleCalcs.some(c=>c.saleVol!==null)&&<div style={{...G.card,padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,marginBottom:12}}>📊 Shift Summary Preview</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Nozzle","Fuel","Open","Close","Net Vol","Revenue","Operator"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead>
                <tbody>{nozzleCalcs.map(c=><tr key={c.key}>
                  <td style={{...G.td,fontWeight:700,color:FUEL.colors[c.nozzle.fuel]}}>{c.nozzle.id}</td>
                  <td style={G.td}><span style={{...G.badge,background:FUEL.colors[c.nozzle.fuel]+"18",color:FUEL.colors[c.nozzle.fuel]}}>{c.nozzle.fuel}</span></td>
                  <td style={{...G.td,fontFamily:"monospace",fontSize:11}}>{fmtN(c.openR)}</td>
                  <td style={{...G.td,fontFamily:"monospace",fontSize:11,color:c.closeR&&!isNaN(c.closeR)?C.green:C.muted}}>{c.closeR&&!isNaN(c.closeR)?fmtN(c.closeR):"—"}</td>
                  <td style={{...G.td,color:C.green,fontWeight:600}}>{c.saleVol!==null?c.saleVol.toFixed(3)+"L":"—"}</td>
                  <td style={{...G.td,fontWeight:700,color:C.accent}}>{c.revenue!==null?fmt(Math.round(c.revenue)):"—"}</td>
                  <td style={{...G.td,fontSize:10,color:C.muted3}}>{c.nozzle.operator||"—"}</td>
                </tr>)}</tbody>
                <tfoot><tr style={{background:C.s2}}>
                  <td colSpan={4} style={{...G.td,fontSize:10,color:C.muted}}>Total</td>
                  <td style={{...G.td,fontWeight:700,color:C.green}}>{nozzleCalcs.reduce((s,c)=>s+(c.saleVol||0),0).toFixed(3)}L</td>
                  <td style={{...G.td,fontFamily:"'Syne',sans-serif",fontWeight:800,color:C.accent}}>{fmt(Math.round(totalSales))}</td>
                  <td style={G.td}/>
                </tr></tfoot>
              </table>
            </div>
          </div>}
        </div>}

        {/* ─── MACHINE TESTS TAB ─── */}
        {tab==="testing"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>🔬 Machine Tests</div><div style={{fontSize:10,color:C.muted3,marginTop:2}}>{myPump?.shortName} · {todayS()}</div></div>
            <button onClick={()=>setShowTestForm(true)} style={{...G.btn,background:C.teal,color:"#000",fontWeight:700}}>+ Run Test</button>
          </div>
          {pendingTests>0&&<div style={{background:C.tealDim,border:"1px solid rgba(6,182,212,.25)",borderRadius:11,padding:"10px 15px",display:"flex",alignItems:"center",gap:11}}>
            <span>🔬</span><div style={{flex:1}}><div style={{fontWeight:700,color:C.teal,fontSize:12}}>{pendingTests} nozzle(s) not yet tested today</div><div style={{fontSize:10,color:C.muted3}}>Complete W&amp;M tests before recording sales</div></div>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {myNozzles.map(n=>{
              const st=getNozzleTestStatus(myTests,n.id,manager.pumpId,todayS());
              const SC={pass:C.green,fail:C.red,warning:C.warn,pending:C.muted2};
              const SI={pass:"✓ Pass",fail:"✗ Fail",warning:"⚠ Warn",pending:"○ Pending"};
              const last=todayTests.filter(t=>t.nozzleId===n.id)[0];
              return <div key={n.id} style={{...G.card,padding:14,borderTop:`3px solid ${SC[st]||C.muted2}`}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:FUEL.colors[n.fuel],marginBottom:3}}>{n.id}</div>
                <div style={{fontSize:9,color:C.muted3,marginBottom:8}}>{n.fuel}</div>
                <span style={{...G.badge,background:(SC[st]||C.muted2)+"18",color:SC[st]||C.muted2,fontSize:9}}>{SI[st]}</span>
                {last&&<div style={{fontSize:9,color:C.muted3,marginTop:6}}>{last.variance}ml variance</div>}
                <button onClick={()=>setShowTestForm(true)} style={{...G.btn,width:"100%",justifyContent:"center",fontSize:9,padding:"5px",marginTop:8,background:st==="pending"?C.tealDim:"transparent",color:st==="pending"?C.teal:C.muted2,border:`1px solid ${st==="pending"?"rgba(6,182,212,.3)":C.border}`}}>{st==="pending"?"Run Test":"Re-test"}</button>
              </div>;
            })}
          </div>
          <MachineTestLog tests={todayTests} nozzles={myNozzles} showFilter={false}/>
        </div>}

        {/* ─── CASH & PAYMENTS TAB ─── */}
        {tab==="cashcoll"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>💰 Cash & Payments — {activeShift.name}</div>
          {myNozzles.map(n=>{
            const key=n.pumpId+n.id;
            const calc=nozzleCalcs.find(c=>c.key===key);
            const f=cashF[key]||{cash:"",card:"",upi:"",credit:""};
            return <div key={key} style={{...G.card,padding:17}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:FUEL.colors[n.fuel],marginBottom:12}}>{n.id} — {n.fuel}
                {calc?.revenue!==null&&<span style={{fontSize:10,color:C.muted3,fontWeight:400,marginLeft:10}}>Expected: {fmt(Math.round(calc.revenue||0))}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[["Cash","cash",C.green],["Card","card",C.blue],["UPI","upi",C.purple],["Credit","credit",C.warn]].map(([l,k,c])=>(
                  <div key={k}><label style={{...G.label,color:c}}>{l} (₹)</label>
                  <input type="number" value={f[k]} onChange={e=>setCashF(cf=>({...cf,[key]:{...(cf[key]||{cash:"",card:"",upi:"",credit:""}),[k]:e.target.value}}))} style={{...G.input,borderColor:k==="credit"?C.warn:C.border}} onFocus={e=>e.target.style.borderColor=c} onBlur={e=>e.target.style.borderColor=k==="credit"?C.warn:C.border}/>
                  </div>
                ))}
              </div>
              {calc?.nVariance!==null&&<div style={{marginTop:11,padding:"8px 13px",background:calc.nVariance===0?"rgba(0,229,179,.1)":Math.abs(calc.nVariance)<200?"rgba(251,191,36,.1)":"rgba(244,63,94,.1)",borderRadius:8,display:"flex",justifyContent:"space-between",fontSize:11}}>
                <span style={{color:C.muted3}}>Collection Variance</span>
                <span style={{fontWeight:700,color:calc.nVariance===0?C.green:Math.abs(calc.nVariance)<200?C.warn:C.red}}>{calc.nVariance===0?"✓ Balanced":(calc.nVariance>0?"+":"")+fmt(calc.nVariance)}</span>
              </div>}
            </div>;
          })}
          <div style={{...G.card,padding:17,background:`linear-gradient(135deg,rgba(245,166,35,.05),rgba(0,229,179,.03))`}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[["Meter Sales",fmt(Math.round(totalSales)),C.blue],["Cash Collected",fmt(Math.round(totalCollected)),C.green],["Variance",fmt(Math.abs(totalVariance))+" "+(totalVariance>0?"(Over)":totalVariance<0?"(Short)":"✓"),totalVariance===0?C.green:Math.abs(totalVariance)<500?C.warn:C.red]].map(([l,v,c])=><div key={l}><div style={{fontSize:9,color:C.muted3,marginBottom:3}}>{l}</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:c}}>{v}</div></div>)}
            </div>
          </div>
        </div>}

        {/* ─── DENOMINATION TAB ─── */}
        {tab==="denom"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>🪙 Denomination Counter</div><div style={{fontSize:10,color:C.muted3,marginTop:2}}>Cash note &amp; coin count for shift handover</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
            {DENOMS.map(d=><div key={d} style={{...G.card,padding:14,display:"flex",gap:12,alignItems:"center"}}>
              <div style={{background:d>=500?C.accentDim:d>=100?C.blueDim:C.s3,borderRadius:8,padding:"8px 12px",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:d>=500?C.accent:d>=100?C.blue:C.muted3,minWidth:58,textAlign:"center"}}>₹{d}</div>
              <input type="number" min="0" value={denomF[d]} onChange={e=>setDenomF(f=>({...f,[d]:e.target.value}))} placeholder="qty" style={{...G.input,flex:1}}/>
              <div style={{fontWeight:700,fontSize:12,minWidth:70,textAlign:"right"}}>{fmt((parseInt(denomF[d])||0)*d)}</div>
            </div>)}
          </div>
          <div style={{...G.card,padding:17,background:`linear-gradient(135deg,rgba(245,166,35,.07),rgba(0,229,179,.04))`}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[["Notes ≥₹500",DENOMS.filter(d=>d>=500).reduce((s,d)=>s+(parseInt(denomF[d])||0)*d,0),C.accent],["Notes ₹10–₹200",DENOMS.filter(d=>d>=10&&d<500).reduce((s,d)=>s+(parseInt(denomF[d])||0)*d,0),C.blue],["Coins",DENOMS.filter(d=>d<10).reduce((s,d)=>s+(parseInt(denomF[d])||0)*d,0),C.muted3]].map(([l,v,c])=><div key={l}><div style={{fontSize:9,color:C.muted3}}>{l}</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,color:c}}>{fmt(v)}</div></div>)}
            </div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:12}}>
              <div style={{fontSize:9,color:C.muted3}}>Grand Total</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:C.accent}}>{fmt(denomTotal)}</div>
              {totalCollected>0&&<div style={{fontSize:10,color:denomTotal===Math.round(totalCollected)?C.green:C.warn,marginTop:4}}>
                {denomTotal===Math.round(totalCollected)?"✓ Matches cash collection":`Difference: ${fmt(Math.abs(denomTotal-Math.round(totalCollected)))}`}
              </div>}
            </div>
          </div>
        </div>}

        {/* ─── TANKS TAB ─── */}
        {tab==="tanks"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>🛢 Dip Reading &amp; Stock</div></div>
          {myTanks.map(t=>{const pct=Math.round(t.stock/t.capacity*100),isLow=t.stock<=t.alertAt;const col=pct<20?C.red:pct<40?C.warn:FUEL.colors[t.fuel];return <div key={t.id} style={{...G.card,padding:17}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:col,marginBottom:11}}>{t.fuel} Tank{isLow&&" ⚠️"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><div style={{fontSize:9,color:C.muted3}}>Stock</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:col}}>{fmtN(t.stock)}<span style={{fontSize:11,color:C.muted3}}>L</span></div></div>
              <div><div style={{fontSize:9,color:C.muted3}}>Capacity</div><div style={{fontSize:16,fontWeight:700}}>{fmtN(t.capacity)}L</div></div>
            </div>
            <div style={{height:5,background:C.s3,borderRadius:3,marginBottom:10}}><div style={{height:"100%",width:pct+"%",background:col,borderRadius:3}}/></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input value={dipF[t.id]||""} onChange={e=>setDipF(f=>({...f,[t.id]:e.target.value}))} placeholder="Dip reading (cm)" style={{...G.input,flex:1,padding:"7px 10px"}}/>
              <button onClick={()=>{if(!dipF[t.id])return;setDb(d=>({...d,tanks:d.tanks.map(tk=>tk.id===t.id?{...tk,dip:parseFloat(dipF[t.id]),updated:todayS()}:tk)}));setDipF(f=>({...f,[t.id]:""}));flash("✓ Dip updated");}} style={{...G.btn,background:col,color:"#000",padding:"7px 13px",fontWeight:700}}>Update</button>
            </div>
          </div>;})}
        </div>}

        {/* ─── ATTENDANCE TAB ─── */}
        {tab==="attendance"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>👷 Attendance</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            <Kpi label="Present" value={myOps.filter(o=>o.present).length} accent={C.green} icon="✅"/>
            <Kpi label="Absent" value={myOps.filter(o=>!o.present).length} accent={C.red} icon="❌"/>
            <Kpi label="Total" value={myOps.length} accent={C.blue} icon="👷"/>
          </div>
          <div style={G.card}>
            <Tbl heads={["Operator","Shift","Assigned Nozzles","Status","Toggle"]}>
              {myOps.map(op=><tr key={op.id}>
                <td style={{...G.td,fontWeight:600}}>{op.name}</td>
                <td style={G.td}>{op.shift}</td>
                <td style={{...G.td,fontSize:10,color:C.muted3}}>{(op.nozzles||[]).join(", ")||"—"}</td>
                <td style={G.td}><Sb s={op.present?"Active":"Inactive"}/></td>
                <td style={G.td}><Toggle on={op.present} onChange={()=>setDb(d=>({...d,operators:d.operators.map(x=>x.id===op.id?{...x,present:!x.present}:x)}))}/></td>
              </tr>)}
            </Tbl>
          </div>
        </div>}

        {/* ─── SHIFT REPORTS TAB ─── */}
        {tab==="history"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>📋 Shift Reports — {myPump?.shortName}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            <Kpi label="Total Shifts" value={myShifts.length} accent={C.blue} icon="📋"/>
            <Kpi label="This Week" value={myShifts.filter(r=>daysDiff(r.date,todayS())<=7).length} accent={C.purple} icon="📅"/>
            <Kpi label="Total Sales" value={fmtL(myShifts.reduce((s,r)=>s+(r.totalSales||0),0))} accent={C.accent} icon="💰"/>
            <Kpi label="Avg/Shift" value={myShifts.length?fmtL(myShifts.reduce((s,r)=>s+(r.totalSales||0),0)/myShifts.length):"—"} accent={C.green} icon="📊"/>
          </div>
          <ShiftReportFilter
            reports={myShifts}
            nozzleReadings={db.nozzleReadings}
            nozzles={myNozzles}
          />
        </div>}

      </div>
    </div>
  </div>;
};
// ═══════════════════════════════════════════════════════════
// OPERATOR DASHBOARD — Nozzle-scoped, shift-aware
// ═══════════════════════════════════════════════════════════
const OperatorDash=({operator,db,setDb,onLogout})=>{
  const[tab,setTab]=useState("operations");
  const[msg,setMsg]=useState("");
  const flash=t=>{setMsg(t);setTimeout(()=>setMsg(""),4000);};
  const myPump=db.pumps.find(p=>p.id===operator.pumpId);
  const myNozzles=db.nozzles.filter(n=>n.pumpId===operator.pumpId&&(operator.nozzles||[]).includes(n.id));
  const myTests=(db.machineTests||[]).filter(t=>t.pumpId===operator.pumpId);
  const[showTestForm,setShowTestForm]=useState(false);
  const[activeShift,setActiveShift]=useState(getCurrentShift());
  const[activeDate,setActiveDate]=useState(todayS());
  const[closeF,setCloseF]=useState({});
  const[cashF,setCashF]=useState({});
  useEffect(()=>{setCloseF({});setCashF({});}, [activeShift.name,activeDate]);

  const alreadySubmitted=db.shiftReports.some(r=>r.pumpId===operator.pumpId&&r.date===activeDate&&r.shift===activeShift.name&&r.status==="Submitted");

  const nozzleOpenReadings=useMemo(()=>{
    const map={};
    myNozzles.forEach(n=>{map[n.pumpId+n.id]=getNozzleOpenForShift(db,n.pumpId,n.id,activeDate,activeShift.name);});
    return map;
  },[myNozzles,db.nozzleReadings,activeDate,activeShift.name]);

  const getTestVol=(nozzleId)=>myTests.filter(t=>t.nozzleId===nozzleId&&t.pumpId===operator.pumpId&&t.date===activeDate&&t.shift===activeShift.name).reduce((s,t)=>s+t.qty,0);

  const nozzleCalcs=useMemo(()=>myNozzles.map(n=>{
    const key=n.pumpId+n.id;
    const openR=nozzleOpenReadings[key]??n.open;
    const closeR=parseFloat(closeF[key]||"");
    const rawVol=!isNaN(closeR)&&closeR>openR?closeR-openR:null;
    const testVol=getTestVol(n.id);
    const saleVol=rawVol!==null?Math.max(0,rawVol-testVol):null;
    const revenue=saleVol!==null?saleVol*FUEL.rates[n.fuel]:null;
    const cf=cashF[key]||{cash:"",card:"",upi:""};
    const collected=(parseFloat(cf.cash)||0)+(parseFloat(cf.card)||0)+(parseFloat(cf.upi)||0);
    return{nozzle:n,key,openR,closeR,rawVol,testVol,saleVol,revenue,collected};
  }),[myNozzles,closeF,cashF,nozzleOpenReadings]);

  const totalSales=nozzleCalcs.reduce((s,c)=>s+(c.revenue||0),0);
  const pendingTests=myNozzles.filter(n=>getNozzleTestStatus(myTests,n.id,operator.pumpId,todayS())==="pending").length;
  const todayTests=myTests.filter(t=>t.date===todayS()&&(operator.nozzles||[]).includes(t.nozzleId));

  const NAV=[
    {k:"operations",icon:"⚙️",label:"My Nozzles"},
    {k:"testing",icon:"🔬",label:"Machine Tests",badge:pendingTests||undefined,bc:C.teal},
    {k:"cashcoll",icon:"💰",label:"Payment Entry"},
    {k:"history",icon:"📋",label:"My History"},
  ];

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Mono',monospace",color:C.text}}>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    {showTestForm&&<MachineTestForm nozzles={myNozzles} operators={[operator]} pumpId={operator.pumpId} ownerId={operator.ownerId} db={db} setDb={setDb} onClose={()=>setShowTestForm(false)} flash={flash}/>}
    <Topbar icon="⛽" ac={C.green} label={`Operator · ${myPump?.shortName||"—"}`} pump={myPump?.name} db={null} notifs={null}
      right={<div style={{display:"flex",gap:8,alignItems:"center"}}>
        {msg&&<div style={{fontSize:11,color:C.green,background:"rgba(0,229,179,.08)",border:"1px solid rgba(0,229,179,.2)",borderRadius:7,padding:"5px 11px"}}>{msg}</div>}
        <div style={{padding:"5px 10px",background:activeShift.color+"18",borderRadius:7,fontSize:10,color:activeShift.color,border:`1px solid ${activeShift.color}30`,fontWeight:700}}>{activeShift.icon} {activeShift.name}</div>
        <button onClick={onLogout} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"6px 12px"}}>Logout</button>
      </div>}
    />
    <div style={{display:"flex"}}>
      <Sidebar items={NAV} active={tab} onNav={setTab} accent={C.green}
        footer={<div style={{padding:"13px 15px",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Shift</div>
          <div style={{display:"flex",gap:5,marginBottom:7}}>
            {SHIFTS.map(s=><button key={s.name} onClick={()=>setActiveShift(s)} style={{...G.btn,flex:1,justifyContent:"center",padding:"5px 3px",fontSize:8,background:activeShift.name===s.name?s.color+"30":C.s3,color:activeShift.name===s.name?s.color:C.muted2,border:`1px solid ${activeShift.name===s.name?s.color+"50":C.border}`}}>{s.icon}</button>)}
          </div>
          <input type="date" value={activeDate} onChange={e=>setActiveDate(e.target.value)} style={{...G.input,fontSize:10,padding:"5px 8px"}}/>
          <div style={{marginTop:7,fontSize:9,color:C.muted3}}>My nozzles: {(operator.nozzles||[]).join(", ")||"—"}</div>
        </div>}
      />
      <div style={{flex:1,padding:20,overflowY:"auto",maxHeight:"calc(100vh - 62px)"}}>

        {tab==="operations"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>{activeShift.icon} My Nozzles — {activeShift.name}</div>
            <div style={{fontSize:10,color:C.muted3,marginTop:2}}>{myPump?.shortName} · {activeDate} · {operator.name}</div>
          </div>
          {alreadySubmitted&&<div style={{background:C.greenDim,border:`1px solid rgba(0,229,179,.3)`,borderRadius:11,padding:"12px 16px"}}>
            <div style={{fontWeight:700,color:C.green,fontSize:12}}>✅ {activeShift.name} shift already submitted</div>
            <div style={{fontSize:10,color:C.muted3,marginTop:2}}>Switch shift or date in the sidebar to view other periods.</div>
          </div>}
          {!alreadySubmitted&&<div style={{background:C.blueDim,border:`1px solid rgba(75,141,248,.2)`,borderRadius:11,padding:"10px 16px"}}>
            <div style={{fontSize:11,color:C.blue,fontWeight:700}}>🔄 Auto-Continuity · Open readings auto-filled from previous shift</div>
          </div>}
          {myNozzles.map(n=>{
            const key=n.pumpId+n.id;
            const openR=nozzleOpenReadings[key]??n.open;
            const testVol=getTestVol(n.id);
            return <NozzleReadingRow key={key} nozzle={n} openReading={openR} closeVal={closeF[key]||""} onClose={v=>setCloseF(f=>({...f,[key]:v}))} testVol={testVol} readOnly={alreadySubmitted}/>;
          })}
          {nozzleCalcs.some(c=>c.saleVol!==null)&&<div style={{...G.card,padding:14,background:`linear-gradient(135deg,rgba(0,229,179,.05),rgba(75,141,248,.03))`}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              <div><div style={{fontSize:9,color:C.muted3}}>Total Vol</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:C.green}}>{nozzleCalcs.reduce((s,c)=>s+(c.saleVol||0),0).toFixed(3)}L</div></div>
              <div><div style={{fontSize:9,color:C.muted3}}>Est. Revenue</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:C.accent}}>{fmt(Math.round(totalSales))}</div></div>
              <div><div style={{fontSize:9,color:C.muted3}}>Nozzles</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18}}>{myNozzles.length}</div></div>
            </div>
          </div>}
        </div>}

        {tab==="testing"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>🔬 Machine Tests</div></div>
            <button onClick={()=>setShowTestForm(true)} style={{...G.btn,background:C.teal,color:"#000",fontWeight:700}}>+ Run Test</button>
          </div>
          {pendingTests>0&&<div style={{background:C.tealDim,border:"1px solid rgba(6,182,212,.25)",borderRadius:11,padding:"10px 15px"}}>
            <div style={{fontWeight:700,color:C.teal,fontSize:12}}>{pendingTests} nozzle(s) not yet tested today</div>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {myNozzles.map(n=>{
              const st=getNozzleTestStatus(myTests,n.id,operator.pumpId,todayS());
              const SC={pass:C.green,fail:C.red,warning:C.warn,pending:C.muted2};
              const SI={pass:"✓ Pass",fail:"✗ Fail",warning:"⚠ Warn",pending:"○ Pending"};
              const last=todayTests.filter(t=>t.nozzleId===n.id)[0];
              return <div key={n.id} style={{...G.card,padding:14,borderTop:`3px solid ${SC[st]||C.muted2}`}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:FUEL.colors[n.fuel],marginBottom:3}}>{n.id}</div>
                <div style={{fontSize:9,color:C.muted3,marginBottom:8}}>{n.fuel}</div>
                <span style={{...G.badge,background:(SC[st]||C.muted2)+"18",color:SC[st]||C.muted2,fontSize:9}}>{SI[st]}</span>
                {last&&<div style={{fontSize:9,color:C.muted3,marginTop:6}}>{last.variance}ml variance</div>}
                <button onClick={()=>setShowTestForm(true)} style={{...G.btn,width:"100%",justifyContent:"center",fontSize:9,padding:"5px",marginTop:8,background:st==="pending"?C.tealDim:"transparent",color:st==="pending"?C.teal:C.muted2,border:`1px solid ${st==="pending"?"rgba(6,182,212,.3)":C.border}`}}>{st==="pending"?"Run Test":"Re-test"}</button>
              </div>;
            })}
          </div>
        </div>}

        {tab==="cashcoll"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>💰 Payment Entry</div>
          {myNozzles.map(n=>{
            const key=n.pumpId+n.id;
            const calc=nozzleCalcs.find(c=>c.key===key);
            const f=cashF[key]||{cash:"",card:"",upi:""};
            return <div key={key} style={{...G.card,padding:17}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:FUEL.colors[n.fuel],marginBottom:12}}>{n.id} — {n.fuel}
                {calc?.revenue!==null&&<span style={{fontSize:10,color:C.muted3,fontWeight:400,marginLeft:10}}>Expected: {fmt(Math.round(calc.revenue||0))}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[["Cash","cash",C.green],["Card","card",C.blue],["UPI","upi",C.purple]].map(([l,k,c])=>(
                  <div key={k}><label style={{...G.label,color:c}}>{l} (₹)</label>
                  <input type="number" value={f[k]} onChange={e=>setCashF(cf=>({...cf,[key]:{...(cf[key]||{cash:"",card:"",upi:""}),[k]:e.target.value}}))} style={G.input} onFocus={e=>e.target.style.borderColor=c} onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                ))}
              </div>
            </div>;
          })}
        </div>}

        {tab==="history"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>📋 My Shift History</div>
          {/* Show nozzle reading history for my nozzles */}
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Date","Shift","Nozzle","Fuel","Open","Close","Net Vol","Revenue"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead>
              <tbody>{db.nozzleReadings.filter(nr=>nr.pumpId===operator.pumpId&&(operator.nozzles||[]).includes(nr.nozzleId)).sort((a,b)=>b.date!==a.date?b.date.localeCompare(a.date):b.shiftIndex-a.shiftIndex).slice(0,40).map(nr=>{
                const shift=SHIFTS.find(s=>s.name===nr.shift)||SHIFTS[0];
                return <tr key={nr.id}>
                  <td style={{...G.td,fontFamily:"monospace",fontSize:11,color:C.muted3}}>{nr.date}</td>
                  <td style={G.td}><span style={{...G.badge,background:shift.color+"18",color:shift.color,fontSize:8}}>{shift.icon} {nr.shift}</span></td>
                  <td style={{...G.td,fontWeight:700,color:FUEL.colors[nr.fuel]}}>{nr.nozzleId}</td>
                  <td style={G.td}><span style={{...G.badge,background:FUEL.colors[nr.fuel]+"18",color:FUEL.colors[nr.fuel],fontSize:8}}>{nr.fuel}</span></td>
                  <td style={{...G.td,fontFamily:"monospace",fontSize:11}}>{fmtN(nr.openReading)}</td>
                  <td style={{...G.td,fontFamily:"monospace",fontSize:11,color:C.green,fontWeight:600}}>{fmtN(nr.closeReading)}</td>
                  <td style={{...G.td,color:C.green,fontWeight:600}}>{nr.saleVol.toFixed(3)}L</td>
                  <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmt(Math.round(nr.revenue))}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>}
      </div>
    </div>
  </div>;
};
// ═══════════════════════════════════════════════════════════
// ADMIN DASHBOARD v6 — Integrations + Owner Stats + Payments
// ═══════════════════════════════════════════════════════════
const StatusDot=({on,label})=><div style={{display:"flex",alignItems:"center",gap:5}}>
  <div style={{width:7,height:7,borderRadius:"50%",background:on?C.green:C.muted,boxShadow:on?`0 0 5px ${C.green}`:undefined}}/>
  <span style={{fontSize:9,color:on?C.green:C.muted3}}>{label}</span>
</div>;

const IntegBadge=({saved,mode})=><div style={{display:"flex",gap:6}}>
  <span style={{...G.badge,background:saved?C.greenDim:"rgba(62,78,106,.4)",color:saved?C.green:C.muted3,fontSize:9}}>{saved?"✓ Connected":"○ Not set"}</span>
  {saved&&mode&&<span style={{...G.badge,background:mode==="live"?C.accentDim:C.blueDim,color:mode==="live"?C.accent:C.blue,fontSize:9}}>{mode==="live"?"🟢 Live":"🔵 Test"}</span>}
</div>;

const FlowStep=({n,text})=><div style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:7}}>
  <div style={{width:18,height:18,borderRadius:"50%",background:C.blueDim,color:C.blue,display:"grid",placeItems:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{n}</div>
  <span style={{fontSize:10,color:C.muted3,lineHeight:1.5}}>{text}</span>
</div>;

const AdminDash=({onLogout,db,setDb})=>{
  const[tab,setTab]=useState("overview");
  const[msg,setMsg]=useState("");
  const flash=t=>{setMsg(t);setTimeout(()=>setMsg(""),4000);};

  // Integration configs
  const[rzp,setRzp]=useState({liveKeyId:"rzp_live_XXXXXXXXXX",liveSecret:"",testKeyId:"rzp_test_MockKey123",testSecret:"",webhookSecret:"",mode:"test",autoCapture:true,sendReceipt:true,currency:"INR",saved:false});
  const[wa,setWa]=useState({provider:"meta",apiKey:"",phoneNumberId:"",wabaId:"",twAccountSid:"",twAuthToken:"",twFrom:"",watiKey:"",namespace:"fuelos_notifications",waNumber:"",templates:{payment:"✅ Payment confirmed! *{{plan}}* plan activated.\nValid till: *{{date}}*\nAmount: *₹{{amount}}*",shift:"📋 Shift: *{{pump}}* · {{shift}}\nSales: *₹{{amount}}*",alert:"⚠️ *Alert — {{pump}}*\n{{message}}",test:"🔬 Machine Test *{{result}}*\nNozzle: {{nozzle}} · Variance: {{variance}}ml"},saved:false});
  const[eml,setEml]=useState({provider:"smtp",host:"smtp.gmail.com",port:"587",user:"",pass:"",from:"noreply@fuelos.in",secure:true,saved:false});
  const[sms,setSms]=useState({provider:"msg91",apiKey:"",senderId:"FUELOS",dltId:"",saved:false});

  // UI state
  const[expandedOwner,setExpandedOwner]=useState(null);
  const[planDropdown,setPlanDropdown]=useState(null);
  const[showCouponForm,setShowCouponForm]=useState(false);
  const[couponF,setCouponF]=useState({code:"",discount:"",type:"flat",maxUses:100});
  const[txnFilter,setTxnFilter]=useState("all");
  const[waFilter,setWaFilter]=useState("all");
  const[integTab,setIntegTab]=useState("razorpay");
  const[testingRzp,setTestingRzp]=useState(false);
  const[testingWa,setTestingWa]=useState(false);
  const[rzpTested,setRzpTested]=useState(false);
  const[waTested,setWaTested]=useState(false);

  // Computed
  const waLog=db.waLog||[];
  const ownerStats=useMemo(()=>db.owners.map(o=>{
    const txns=db.transactions.filter(t=>t.ownerId===o.id);
    const waMsgs=waLog.filter(w=>w.ownerId===o.id);
    const pumps=db.pumps.filter(p=>p.ownerId===o.id);
    const txnOk=txns.filter(t=>t.status==="Success");
    const txnFail=txns.filter(t=>t.status==="Failed");
    const waDel=waMsgs.filter(w=>w.status==="Delivered").length;
    const waFail=waMsgs.filter(w=>w.status==="Failed").length;
    return{...o,pumps:pumps.length,txns,txnOk,txnFail,paidAmt:txnOk.reduce((s,t)=>s+t.amount,0),waMsgs,waDel,waFail,waRate:waMsgs.length?Math.round(waDel/waMsgs.length*100):0};
  }),[db.owners,db.transactions,waLog,db.pumps]);

  const allTxns=[...db.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  const txnOkAll=allTxns.filter(t=>t.status==="Success");
  const txnFailAll=allTxns.filter(t=>t.status==="Failed");
  const filteredTxns=txnFilter==="all"?allTxns:txnFilter==="success"?txnOkAll:txnFailAll;
  const filteredWa=waFilter==="all"?waLog:waFilter==="Delivered"||waFilter==="Failed"?waLog.filter(w=>w.status===waFilter):waLog.filter(w=>w.type===waFilter);
  const totalWaDel=waLog.filter(w=>w.status==="Delivered").length;
  const totalWaFail=waLog.filter(w=>w.status==="Failed").length;
  const mrr=db.owners.filter(o=>o.status==="Active").reduce((s,o)=>s+(PLANS[o.plan]?.price||0),0);
  const expiringIn7=db.owners.filter(o=>o.endDate&&daysDiff(todayS(),o.endDate)<=7&&daysDiff(todayS(),o.endDate)>0);
  const failedTestsToday=(db.machineTests||[]).filter(t=>t.date===todayS()&&t.result==="Fail");
  const pumpColors=[C.accent,C.blue,C.teal,C.green,C.purple,C.warn];
  const integCount=[rzp.saved,wa.saved,eml.saved,sms.saved].filter(Boolean).length;

  // Actions
  const forceChangePlan=(ownerId,plan)=>{
    setDb(d=>({...d,
      owners:d.owners.map(o=>o.id===ownerId?{...o,plan,status:"Active",startDate:todayS(),endDate:addMo(todayS(),1),daysUsed:0}:o),
      auditLog:[{id:"AL"+rid(),user:"admin@fuelos.in",role:"Admin",action:`Force plan → ${plan} for ${db.owners.find(o=>o.id===ownerId)?.name}`,time:todayS()+" "+new Date().toTimeString().slice(0,5),ip:"127.0.0.1"},...(d.auditLog||[])],
    }));
    setPlanDropdown(null);flash("✓ Plan changed to "+plan+" — limits enforced immediately");
  };
  const retryTxn=(txnId)=>{
    const txn=db.transactions.find(t=>t.id===txnId);
    if(!txn)return;
    setDb(d=>({...d,
      transactions:d.transactions.map(t=>t.id===txnId?{...t,status:"Success",planActivated:true}:t),
      owners:d.owners.map(o=>o.id===txn.ownerId?{...o,plan:txn.plan,status:"Active",startDate:todayS(),endDate:addMo(todayS(),1)}:o),
    }));
    flash("✓ Retried — plan "+txn.plan+" activated for owner");
  };
  const toggleOwner=(ownerId)=>{
    setDb(d=>({...d,owners:d.owners.map(o=>o.id===ownerId?{...o,status:o.status==="Active"?"Suspended":"Active"}:o)}));
    flash("Owner status updated");
  };
  const extendSub=(ownerId,months)=>{
    setDb(d=>({...d,owners:d.owners.map(o=>o.id===ownerId?{...o,endDate:addMo(o.endDate||todayS(),months)}:o)}));
    flash(`✓ Extended by ${months} month(s)`);
  };
  const testRzpConn=()=>{
    setTestingRzp(true);setRzpTested(false);
    setTimeout(()=>{setTestingRzp(false);setRzpTested(true);flash("✓ Razorpay connection OK — test payment verified");},2000);
  };
  const testWaConn=()=>{
    setTestingWa(true);setWaTested(false);
    setTimeout(()=>{setTestingWa(false);setWaTested(true);flash("✓ WhatsApp test message delivered to "+wa.waNumber);},1800);
  };

  const NAV=[
    {k:"overview",icon:"📊",label:"Overview"},
    {k:"owners",icon:"👤",label:"Owners & Stats",badge:db.owners.filter(o=>o.status==="Pending").length||undefined,bc:C.warn},
    {k:"payments",icon:"💳",label:"Payments",badge:txnFailAll.length||undefined,bc:C.red},
    {k:"wastats",icon:"💬",label:"WhatsApp Stats",badge:totalWaFail||undefined,bc:totalWaFail>0?C.red:undefined},
    {k:"pumps",icon:"⛽",label:"All Pumps",badge:db.pumps.length,bc:C.blue},
    {k:"tests",icon:"🔬",label:"Machine Tests",badge:failedTestsToday.length||undefined,bc:C.red},
    {k:"analytics",icon:"📈",label:"Analytics"},
    {div:true,k:"d1"},
    {k:"integrations",icon:"🔌",label:"Integrations",badge:integCount+"/4",bc:integCount===4?C.green:C.warn},
    {k:"health",icon:"🖥",label:"System Health",badge:(db.services||[]).filter(s=>s.status!=="Online").length||undefined,bc:C.red},
    {k:"audit",icon:"📋",label:"Audit Log"},
    {k:"coupons",icon:"🎟",label:"Coupons"},
    {k:"alerts",icon:"🔔",label:"Alerts"},
  ];

  const H=({icon,title,sub,right})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
    <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800}}>{icon} {title}</div>{sub&&<div style={{fontSize:11,color:C.muted3,marginTop:3}}>{sub}</div>}</div>{right}
  </div>;

  const CfgInput=({label,hint,type="text",value,onChange,placeholder})=><div style={{marginBottom:13}}>
    <label style={G.label}>{label}</label>
    {hint&&<div style={{fontSize:9,color:C.muted,marginBottom:5}}>{hint}</div>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={G.input} onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border}/>
  </div>;

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Mono',monospace",color:C.text}}>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <Topbar icon="🛡" ac={C.purple} label="Admin · FuelOS Platform" db={db}
      right={<div style={{display:"flex",gap:10,alignItems:"center"}}>
        {msg&&<div style={{fontSize:11,color:C.green,background:"rgba(0,229,179,.08)",border:"1px solid rgba(0,229,179,.2)",borderRadius:7,padding:"5px 11px"}}>{msg}</div>}
        <div style={{display:"flex",gap:8,padding:"0 4px"}}><StatusDot on={rzp.saved} label="Pay"/><StatusDot on={wa.saved} label="WA"/></div>
        <button onClick={onLogout} style={{...G.btn,background:C.s2,color:C.muted2,border:`1px solid ${C.border}`,padding:"6px 12px"}}>Logout</button>
      </div>}
    />
    <div style={{display:"flex"}}>
      <Sidebar items={NAV} active={tab} onNav={setTab} accent={C.purple}
        footer={<div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Platform Health</div>
          <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:2}}>{fmt(mrr)}<span style={{color:C.muted3,fontWeight:400,fontSize:10}}>/mo MRR</span></div>
          <div style={{fontSize:9,color:C.muted3,marginBottom:9}}>{db.owners.filter(o=>o.status==="Active").length} active subscribers</div>
          <div style={{display:"flex",gap:4,marginBottom:4}}>
            {[["Razorpay",rzp.saved,C.blue],["WhatsApp",wa.saved,C.green],["Email",eml.saved,C.purple],["SMS",sms.saved,C.accent]].map(([n,ok,c])=><div key={n} style={{flex:1,height:3,borderRadius:2,background:ok?c:C.muted}} title={n}/>)}
          </div>
          <div style={{fontSize:8,color:C.muted}}>{integCount}/4 integrations live</div>
        </div>}
      />
      <div style={{flex:1,padding:20,overflowY:"auto",maxHeight:"calc(100vh - 62px)"}}>

{/* ── OVERVIEW ── */}
{tab==="overview"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="🛡" title="Platform Overview" sub={new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}/>
  {expiringIn7.length>0&&<div style={{background:C.warnDim,border:`1px solid rgba(251,191,36,.25)`,borderRadius:11,padding:"12px 18px",display:"flex",gap:12,alignItems:"center"}}>
    <span style={{fontSize:20}}>⏰</span>
    <div style={{flex:1}}><div style={{fontWeight:700,color:C.warn}}>{expiringIn7.length} subscription(s) expiring in 7 days</div><div style={{fontSize:10,color:C.muted3}}>{expiringIn7.map(o=>o.name).join(" · ")}</div></div>
    <button onClick={()=>setTab("owners")} style={{...G.btn,background:C.warn,color:"#000",padding:"5px 13px",fontSize:10,fontWeight:700}}>Manage →</button>
  </div>}
  {txnFailAll.length>0&&<div style={{background:C.redDim,border:`1px solid rgba(244,63,94,.25)`,borderRadius:11,padding:"12px 18px",display:"flex",gap:12,alignItems:"center"}}>
    <span style={{fontSize:20}}>💳</span>
    <div style={{flex:1}}><div style={{fontWeight:700,color:C.red}}>{txnFailAll.length} failed payment(s) — plans not activated</div><div style={{fontSize:10,color:C.muted3}}>Retry to activate subscriptions immediately</div></div>
    <button onClick={()=>setTab("payments")} style={{...G.btn,background:C.red,color:"#fff",padding:"5px 13px",fontSize:10,fontWeight:700}}>Review →</button>
  </div>}
  {integCount<4&&<div style={{background:C.tealDim,border:`1px solid rgba(6,182,212,.25)`,borderRadius:11,padding:"12px 18px",display:"flex",gap:12,alignItems:"center"}}>
    <span style={{fontSize:20}}>🔌</span>
    <div style={{flex:1}}>
      <div style={{fontWeight:700,color:C.teal}}>Configure integrations to enable payments &amp; notifications</div>
      <div style={{display:"flex",gap:8,marginTop:5}}>
        {[["Razorpay",rzp.saved],["WhatsApp",wa.saved],["Email",eml.saved],["SMS",sms.saved]].map(([n,ok])=><span key={n} style={{...G.badge,background:ok?C.greenDim:"rgba(62,78,106,.4)",color:ok?C.green:C.muted3,fontSize:8}}>{ok?"✓":""} {n}</span>)}
      </div>
    </div>
    <button onClick={()=>setTab("integrations")} style={{...G.btn,background:C.teal,color:"#000",padding:"5px 13px",fontSize:10,fontWeight:700}}>Configure →</button>
  </div>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
    <Kpi label="MRR" value={fmt(mrr)} sub={`${db.owners.filter(o=>o.status==="Active").length} active`} accent={C.accent} icon="💰" onClick={()=>setTab("analytics")}/>
    <Kpi label="Total Revenue" value={fmtL(txnOkAll.reduce((s,t)=>s+t.amount,0))} sub="all time" accent={C.green} icon="📈"/>
    <Kpi label="Owners" value={db.owners.length} sub={`${db.owners.filter(o=>o.status==="Active").length} active`} accent={C.purple} icon="👤" onClick={()=>setTab("owners")}/>
    <Kpi label="Pumps / Nozzles" value={`${db.pumps.length}/${db.nozzles.length}`} accent={C.blue} icon="⛽" onClick={()=>setTab("pumps")}/>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
    <Kpi label="WA Delivered" value={totalWaDel} sub={`${totalWaFail} failed`} accent={C.green} icon="💬" onClick={()=>setTab("wastats")}/>
    <Kpi label="Payments OK" value={txnOkAll.length} sub={`${txnFailAll.length} failed`} accent={C.blue} icon="✅" onClick={()=>setTab("payments")}/>
    <Kpi label="Machine Tests" value={(db.machineTests||[]).length} sub={`${(db.machineTests||[]).filter(t=>t.result==="Fail").length} fails`} accent={C.teal} icon="🔬" onClick={()=>setTab("tests")}/>
    <Kpi label="Integrations" value={`${integCount}/4`} sub="configured" accent={integCount===4?C.green:C.warn} icon="🔌" onClick={()=>setTab("integrations")}/>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
    {Object.entries(PLANS).map(([name,p])=>{
      const cnt=db.owners.filter(o=>o.plan===name&&o.status==="Active").length;
      return <div key={name} style={{...G.card,padding:16,borderTop:`3px solid ${p.color}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div><div style={{fontSize:20}}>{p.icon}</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:p.color,marginTop:4}}>{name}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800}}>{cnt}</div><div style={{fontSize:9,color:C.muted3}}>subscriber{cnt!==1?"s":""}</div></div>
        </div>
        <div style={{fontSize:10,color:C.muted3}}>{fmt(p.price)}/mo · {fmt(cnt*(p.price||0))}/mo total</div>
        <div style={{height:3,background:C.s3,borderRadius:2,marginTop:10,overflow:"hidden"}}><div style={{height:"100%",width:Math.round(cnt/Math.max(1,db.owners.length)*100)+"%",background:p.color,borderRadius:2}}/></div>
      </div>;
    })}
  </div>
  <div style={{...G.card,padding:18}}>
    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:13}}>Platform Revenue Trend</div>
    <MultiLineChart data={aggregateSales(db.sales,null).map(d=>({label:d.date.slice(5),petrol:d.petrol,diesel:d.diesel,cng:d.cng}))} keys={["petrol","diesel","cng"]} colors={[C.blue,C.accent,C.green]}/>
    <div style={{display:"flex",gap:13,marginTop:9}}>{[["Petrol",C.blue],["Diesel",C.accent],["CNG",C.green]].map(([l,c])=><div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted3}}><div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}</div>)}</div>
  </div>
</div>}

{/* ── OWNERS & STATS ── */}
{tab==="owners"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
  <H icon="👤" title="Owner Management" sub={`${db.owners.length} total · ${db.owners.filter(o=>o.status==="Active").length} active`}/>
  {ownerStats.map(o=>{
    const isExp=expandedOwner===o.id;
    const pl=PLANS[o.plan]||PLANS.Starter;
    const dl=o.endDate?daysDiff(todayS(),o.endDate):0;
    const dlCol=dl<=3?C.red:dl<=10?C.warn:C.green;
    const pumps=db.pumps.filter(p=>p.ownerId===o.id);
    return <div key={o.id} style={{...G.card,overflow:"visible"}}>
      <div onClick={()=>setExpandedOwner(isExp?null:o.id)} style={{padding:"13px 18px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{width:38,height:38,borderRadius:10,background:pl.color+"20",display:"grid",placeItems:"center",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:pl.color,flexShrink:0}}>{o.name.slice(0,2)}</div>
        <div style={{flex:1,minWidth:150}}>
          <div style={{fontWeight:700,fontSize:13}}>{o.name}</div>
          <div style={{fontSize:9,color:C.muted3}}>{o.email} · {o.city}</div>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{...G.badge,background:pl.color+"18",color:pl.color,fontSize:9}}>{pl.icon} {o.plan}</span>
          <Sb s={o.status}/>
          {o.endDate&&<span style={{fontSize:9,fontWeight:700,color:dlCol,background:dlCol+"14",padding:"2px 8px",borderRadius:6}}>{dl}d</span>}
          <div style={{background:C.greenDim,border:`1px solid rgba(0,229,179,.2)`,borderRadius:6,padding:"3px 8px",fontSize:9,color:C.green}}>💬 {o.waDel}/{o.waMsgs.length}</div>
          <div style={{background:o.txnFail.length>0?C.redDim:C.s2,border:`1px solid ${o.txnFail.length>0?"rgba(244,63,94,.2)":C.border}`,borderRadius:6,padding:"3px 8px",fontSize:9,color:o.txnFail.length>0?C.red:C.muted3}}>💳 {o.txnOk.length}/{o.txns.length}</div>
          <div style={{background:C.blueDim,border:`1px solid rgba(75,141,248,.2)`,borderRadius:6,padding:"3px 8px",fontSize:9,color:C.blue}}>⛽ {o.pumps}</div>
          <span style={{color:C.muted,fontSize:11}}>{isExp?"▲":"▼"}</span>
        </div>
      </div>
      {isExp&&<div style={{borderTop:`1px solid ${C.border}`,padding:"16px 18px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:14}}>
          {[["WA Sent",o.waDel,C.green,"💬"],["WA Failed",o.waFail,o.waFail>0?C.red:C.muted3,"❌"],["WA Rate",o.waRate+"%",o.waRate>95?C.green:o.waRate>80?C.warn:C.red,"📊"],["Pmts OK",o.txnOk.length,C.blue,"✅"],["Pmts Failed",o.txnFail.length,o.txnFail.length>0?C.red:C.muted3,"⚠"],["Total Paid",fmt(o.paidAmt),C.accent,"💰"]].map(([l,v,c,ic])=><div key={l} style={{background:C.s2,borderRadius:9,padding:"10px 11px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted3,marginBottom:2}}>{ic} {l}</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:c}}>{v}</div></div>)}
        </div>
        {pumps.length>0&&<div style={{marginBottom:13}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Pumps</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{pumps.map(p=><div key={p.id} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 11px",fontSize:10}}><span style={{fontWeight:700}}>{p.shortName}</span><span style={{color:C.muted3,marginLeft:5}}>{p.city}</span></div>)}</div>
        </div>}
        {o.txns.length>0&&<div style={{marginBottom:13}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Recent Payments</div>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr>{["Txn ID","Plan","Amount","Method","Date","Plan Activated","Status","Action"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead>
            <tbody>{o.txns.slice(0,5).map(t=><tr key={t.id} style={{background:t.status==="Failed"?"rgba(244,63,94,.04)":""}}>
              <td style={{...G.td,fontFamily:"monospace",fontSize:9,color:C.muted3}}>{t.id}</td>
              <td style={G.td}><span style={{...G.badge,background:pl.color+"18",color:pl.color,fontSize:8}}>{t.plan}</span></td>
              <td style={{...G.td,fontWeight:700,color:t.status==="Success"?C.accent:C.red}}>{fmt(t.amount)}</td>
              <td style={{...G.td,fontSize:10,color:C.muted3}}>{t.method}</td>
              <td style={{...G.td,fontSize:9,color:C.muted3}}>{t.date}</td>
              <td style={G.td}><span style={{...G.badge,background:t.planActivated?C.greenDim:C.redDim,color:t.planActivated?C.green:C.red,fontSize:8}}>{t.planActivated?"✓ Yes":"✗ No"}</span></td>
              <td style={G.td}><Sb s={t.status}/>{t.failReason&&<div style={{fontSize:8,color:C.red}}>{t.failReason}</div>}</td>
              <td style={G.td}>{t.status==="Failed"&&<button onClick={()=>retryTxn(t.id)} style={{...G.btn,background:C.greenDim,color:C.green,border:`1px solid rgba(0,229,179,.3)`,padding:"3px 9px",fontSize:9,fontWeight:700}}>✓ Retry</button>}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        {o.waMsgs.length>0&&<div style={{marginBottom:13}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>WhatsApp Log</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {o.waMsgs.slice(0,4).map(w=><div key={w.id} style={{background:C.s2,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:9,fontWeight:600,marginBottom:1}}>{w.type.toUpperCase()} · {w.phone}</div><div style={{fontSize:9,color:C.muted3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.msg}</div></div>
              <div style={{display:"flex",gap:5,flexShrink:0}}><span style={{fontSize:9,color:C.muted3}}>{w.date}</span><Sb s={w.status}/></div>
            </div>)}
          </div>
        </div>}
        <div style={{display:"flex",gap:7,flexWrap:"wrap",borderTop:`1px solid ${C.border}`,paddingTop:13,position:"relative"}}>
          <div style={{position:"relative"}}>
            <button onClick={()=>setPlanDropdown(planDropdown===o.id?null:o.id)} style={{...G.btn,background:C.purpleDim,color:C.purple,border:`1px solid rgba(167,139,250,.3)`,padding:"6px 12px",fontSize:10}}>🔧 Change Plan ▾</button>
            {planDropdown===o.id&&<div style={{position:"absolute",top:"calc(100% + 5px)",left:0,background:C.s1,border:`1px solid ${C.border}`,borderRadius:10,padding:7,zIndex:200,boxShadow:"0 8px 24px rgba(0,0,0,.6)",minWidth:155}}>
              {Object.entries(PLANS).map(([name,p])=><button key={name} onClick={()=>forceChangePlan(o.id,name)} style={{...G.btn,background:o.plan===name?p.color+"20":"transparent",color:o.plan===name?p.color:C.muted3,padding:"7px 12px",width:"100%",justifyContent:"flex-start",fontSize:11,border:`1px solid ${o.plan===name?p.color+"40":"transparent"}`,marginBottom:2}}>{p.icon} {name}{o.plan===name?" ✓":""}</button>)}
            </div>}
          </div>
          <button onClick={()=>toggleOwner(o.id)} style={{...G.btn,background:o.status==="Active"?C.warnDim:C.greenDim,color:o.status==="Active"?C.warn:C.green,border:`1px solid ${o.status==="Active"?"rgba(251,191,36,.3)":"rgba(0,229,179,.3)"}`,padding:"6px 12px",fontSize:10}}>{o.status==="Active"?"⏸ Suspend":"▶ Reactivate"}</button>
          <button onClick={()=>extendSub(o.id,1)} style={{...G.btn,background:C.blueDim,color:C.blue,border:`1px solid rgba(75,141,248,.3)`,padding:"6px 12px",fontSize:10}}>+30d</button>
          <button onClick={()=>extendSub(o.id,12)} style={{...G.btn,background:C.blueDim,color:C.blue,border:`1px solid rgba(75,141,248,.3)`,padding:"6px 12px",fontSize:10}}>+1yr</button>
          <button onClick={()=>flash("📧 Reminder sent to "+o.email)} style={{...G.btn,background:C.s3,color:C.muted2,border:`1px solid ${C.border}`,padding:"6px 12px",fontSize:10}}>📧 Remind</button>
          <button onClick={()=>flash("💬 WhatsApp sent to "+o.email)} style={{...G.btn,background:C.greenDim,color:C.green,border:`1px solid rgba(0,229,179,.3)`,padding:"6px 12px",fontSize:10}}>💬 WA</button>
        </div>
      </div>}
    </div>;
  })}
</div>}

{/* ── PAYMENTS ── */}
{tab==="payments"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="💳" title="Payment Management" sub={`${txnOkAll.length} successful · ${txnFailAll.length} failed · Plan auto-activated on payment.captured webhook`}/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
    <Kpi label="Total Revenue" value={fmtL(txnOkAll.reduce((s,t)=>s+t.amount,0))} sub="all time" accent={C.accent} icon="💰"/>
    <Kpi label="Successful" value={txnOkAll.length} sub="plan activated" accent={C.green} icon="✅"/>
    <Kpi label="Failed" value={txnFailAll.length} sub="plans pending" accent={txnFailAll.length>0?C.red:C.muted} icon="❌"/>
    <Kpi label="Success Rate" value={allTxns.length?Math.round(txnOkAll.length/allTxns.length*100)+"%":"—"} accent={C.blue} icon="📊"/>
  </div>
  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>Owner-wise Payment &amp; WhatsApp Stats</div>
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
      <thead><tr>{["Owner","Plan","WA Sent","WA Failed","WA Rate","Pmts OK","Pmts Failed","Total Paid","Sub Status"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead>
      <tbody>{ownerStats.map(o=>{
        const waRate=o.waRate;
        return <tr key={o.id}>
          <td style={{...G.td,fontWeight:700}}>{o.name}<div style={{fontSize:9,color:C.muted3}}>{o.email}</div></td>
          <td style={G.td}><span style={{...G.badge,background:PLANS[o.plan]?.color+"18",color:PLANS[o.plan]?.color,fontSize:9}}>{PLANS[o.plan]?.icon} {o.plan}</span></td>
          <td style={{...G.td,color:C.green,fontWeight:600}}>{o.waDel}</td>
          <td style={{...G.td,color:o.waFail>0?C.red:C.muted3,fontWeight:o.waFail>0?700:400}}>{o.waFail}</td>
          <td style={G.td}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:50,height:4,background:C.s3,borderRadius:2}}><div style={{height:"100%",width:waRate+"%",background:waRate>95?C.green:waRate>80?C.warn:C.red,borderRadius:2}}/></div><span style={{fontSize:10,color:waRate>95?C.green:waRate>80?C.warn:C.red,fontWeight:700}}>{waRate}%</span></div></td>
          <td style={{...G.td,color:C.green,fontWeight:700}}>{o.txnOk.length}</td>
          <td style={{...G.td,color:o.txnFail.length>0?C.red:C.muted3,fontWeight:o.txnFail.length>0?700:400}}>{o.txnFail.length}</td>
          <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmt(o.paidAmt)}</td>
          <td style={G.td}><Sb s={o.status}/></td>
        </tr>;
      })}</tbody>
    </table>
  </div>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>All Transactions</div>
    <div style={{display:"flex",gap:7}}>{[["all","All",C.muted3],["success","Success ✓",C.green],["failed","Failed ✗",C.red]].map(([k,l,c])=><button key={k} onClick={()=>setTxnFilter(k)} style={{...G.btn,background:txnFilter===k?c+"18":"transparent",color:txnFilter===k?c:C.muted3,border:`1px solid ${txnFilter===k?c+"40":C.border}`,padding:"5px 11px",fontSize:10,fontWeight:txnFilter===k?700:400}}>{l}</button>)}</div>
  </div>
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
      <thead><tr>{["Razorpay ID","Owner","Plan","Amount","GST","Method","Date","Plan Activated","Status","Action"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead>
      <tbody>{filteredTxns.map(t=>{
        const owner=db.owners.find(o=>o.id===t.ownerId);
        const pl=PLANS[t.plan];
        return <tr key={t.id} style={{background:t.status==="Failed"?"rgba(244,63,94,.04)":""}}>
          <td style={{...G.td,fontFamily:"monospace",fontSize:9,color:C.muted3}}>{t.razorId||t.id}</td>
          <td style={{...G.td,fontSize:11,fontWeight:600}}>{owner?.name||t.ownerId}</td>
          <td style={G.td}><span style={{...G.badge,background:pl?.color+"18"||C.accentDim,color:pl?.color||C.accent,fontSize:8}}>{pl?.icon} {t.plan}</span></td>
          <td style={{...G.td,fontWeight:800,color:t.status==="Success"?C.accent:C.red}}>{fmt(t.amount)}</td>
          <td style={{...G.td,fontSize:10,color:C.muted3}}>{fmt(t.gst)}</td>
          <td style={{...G.td,fontSize:10,color:C.muted3}}>{t.method}</td>
          <td style={{...G.td,fontSize:10,color:C.muted3}}>{t.date}</td>
          <td style={G.td}><span style={{...G.badge,background:t.planActivated?C.greenDim:C.redDim,color:t.planActivated?C.green:C.red,fontSize:8}}>{t.planActivated?"✓ Yes":"✗ No"}</span></td>
          <td style={G.td}><Sb s={t.status}/>{t.failReason&&<div style={{fontSize:8,color:C.red,marginTop:1}}>{t.failReason}</div>}</td>
          <td style={G.td}>{t.status==="Failed"&&<button onClick={()=>retryTxn(t.id)} style={{...G.btn,background:C.greenDim,color:C.green,border:`1px solid rgba(0,229,179,.3)`,padding:"3px 10px",fontSize:9,fontWeight:700}}>✓ Retry</button>}</td>
        </tr>;
      })}
      {filteredTxns.length===0&&<tr><td colSpan={10} style={{...G.td,textAlign:"center",color:C.muted,padding:28}}>No transactions</td></tr>}
      </tbody>
      {filteredTxns.length>1&&<tfoot><tr style={{background:C.s2}}>
        <td colSpan={3} style={{...G.td,fontSize:10,color:C.muted}}>Total ({filteredTxns.length} txns)</td>
        <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmt(filteredTxns.reduce((s,t)=>s+t.amount,0))}</td>
        <td style={{...G.td,color:C.muted3}}>{fmt(filteredTxns.reduce((s,t)=>s+t.gst,0))}</td>
        <td colSpan={5}/>
      </tr></tfoot>}
    </table>
  </div>
</div>}

{/* ── WA STATS ── */}
{tab==="wastats"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="💬" title="WhatsApp Stats" sub={`${waLog.length} total messages · ${totalWaDel} delivered · ${totalWaFail} failed`}/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
    <Kpi label="Delivered" value={totalWaDel} accent={C.green} icon="✅"/>
    <Kpi label="Failed" value={totalWaFail} accent={totalWaFail>0?C.red:C.muted} icon="❌"/>
    <Kpi label="Delivery Rate" value={waLog.length?Math.round(totalWaDel/waLog.length*100)+"%":"—"} accent={C.blue} icon="📊"/>
    <Kpi label="Message Types" value={[...new Set(waLog.map(w=>w.type))].length} accent={C.teal} icon="🏷"/>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
    {["payment","shift","alert","test"].map(type=>{
      const msgs=waLog.filter(w=>w.type===type);
      const icons={payment:"💳",shift:"📋",alert:"⚠️",test:"🔬"};
      const ok=msgs.filter(w=>w.status==="Delivered").length;
      return <div key={type} style={{...G.card,padding:14}}>
        <div style={{fontSize:18,marginBottom:5}}>{icons[type]}</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,textTransform:"capitalize",marginBottom:2}}>{type}</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,marginBottom:2}}>{msgs.length}</div>
        <div style={{fontSize:9,color:ok===msgs.length?C.green:C.warn}}>{ok}/{msgs.length} delivered</div>
      </div>;
    })}
  </div>
  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
    {[["all","All"],["payment","Payment"],["shift","Shift"],["alert","Alert"],["test","Test"],["Delivered","✓ Delivered"],["Failed","✗ Failed"]].map(([k,l])=><button key={k} onClick={()=>setWaFilter(k)} style={{...G.btn,background:waFilter===k?C.greenDim:"transparent",color:waFilter===k?C.green:C.muted3,border:`1px solid ${waFilter===k?C.green+"40":C.border}`,padding:"5px 11px",fontSize:10,fontWeight:waFilter===k?700:400}}>{l}</button>)}
  </div>
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><tr>{["Owner","Type","Message Preview","Phone","Date","Status"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead>
      <tbody>{filteredWa.map(w=>{
        const owner=db.owners.find(o=>o.id===w.ownerId);
        const icons={payment:"💳",shift:"📋",alert:"⚠️",test:"🔬"};
        return <tr key={w.id}>
          <td style={{...G.td,fontSize:11,fontWeight:600}}>{owner?.name||w.ownerId}</td>
          <td style={G.td}><span style={{...G.badge,background:C.s3,color:C.muted3,fontSize:8}}>{icons[w.type]} {w.type}</span></td>
          <td style={{...G.td,fontSize:10,color:C.muted3,maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.msg}</td>
          <td style={{...G.td,fontFamily:"monospace",fontSize:10,color:C.muted3}}>{w.phone}</td>
          <td style={{...G.td,fontSize:10,color:C.muted3}}>{w.date}</td>
          <td style={G.td}><Sb s={w.status}/></td>
        </tr>;
      })}
      {filteredWa.length===0&&<tr><td colSpan={6} style={{...G.td,textAlign:"center",color:C.muted,padding:24}}>No messages</td></tr>}
      </tbody>
    </table>
  </div>
</div>}

{/* ── INTEGRATIONS ── */}
{tab==="integrations"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
  <H icon="🔌" title="Integration Configuration" sub="API keys, webhooks, and message templates for all external services"/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
    {[{k:"razorpay",n:"Razorpay",icon:"💳",ok:rzp.saved,c:C.blue},{k:"whatsapp",n:"WhatsApp",icon:"💬",ok:wa.saved,c:C.green},{k:"email",n:"Email/SMTP",icon:"📧",ok:eml.saved,c:C.purple},{k:"sms",n:"SMS API",icon:"📱",ok:sms.saved,c:C.accent}].map(s=><div key={s.k} onClick={()=>setIntegTab(s.k)} style={{...G.card,padding:14,borderTop:`3px solid ${s.ok?s.c:C.muted}`,cursor:"pointer",opacity:integTab===s.k?1:.7,transition:"all .15s",boxShadow:integTab===s.k?`0 0 0 1px ${s.c}40`:undefined}}>
      <div style={{fontSize:22,marginBottom:5}}>{s.icon}</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:s.ok?s.c:C.muted3,marginBottom:5}}>{s.n}</div>
      <IntegBadge saved={s.ok} mode={s.k==="razorpay"?rzp.mode:undefined}/>
    </div>)}
  </div>

  {/* RAZORPAY */}
  {integTab==="razorpay"&&<div style={{...G.card}}>
    <div style={{padding:"15px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:40,height:40,borderRadius:10,background:C.blueDim,display:"grid",placeItems:"center",fontSize:20}}>💳</div><div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:C.blue}}>Razorpay Payment Gateway</div><div style={{fontSize:10,color:C.muted3}}>Subscription billing · Webhook-driven auto plan activation</div></div></div>
      <IntegBadge saved={rzp.saved} mode={rzp.mode}/>
    </div>
    <div style={{padding:"18px 20px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.blue,marginBottom:11,display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:C.blue}}/>Test Credentials (Sandbox)</div>
          <CfgInput label="Test Key ID" hint="Starts with rzp_test_ — for development" value={rzp.testKeyId} onChange={e=>setRzp(c=>({...c,testKeyId:e.target.value}))} placeholder="rzp_test_..."/>
          <CfgInput label="Test Key Secret" type="password" value={rzp.testSecret} onChange={e=>setRzp(c=>({...c,testSecret:e.target.value}))} placeholder="••••••••••••••••"/>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:11,display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:C.accent}}/>Live Credentials (Production)</div>
          <CfgInput label="Live Key ID" hint="Starts with rzp_live_ — never expose client-side" value={rzp.liveKeyId} onChange={e=>setRzp(c=>({...c,liveKeyId:e.target.value}))} placeholder="rzp_live_..."/>
          <CfgInput label="Live Key Secret" type="password" value={rzp.liveSecret} onChange={e=>setRzp(c=>({...c,liveSecret:e.target.value}))} placeholder="••••••••••••••••"/>
        </div>
      </div>
      <CfgInput label="Webhook Secret" hint="From Razorpay Dashboard → Settings → Webhooks. Used server-side to verify HMAC-SHA256 signature of incoming events." value={rzp.webhookSecret} onChange={e=>setRzp(c=>({...c,webhookSecret:e.target.value}))} placeholder="whsec_..."/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <label style={G.label}>Active Mode</label>
          <div style={{display:"flex",gap:7}}>{[["test","🔵 Test",C.blue],["live","🟢 Live",C.accent]].map(([m,l,c])=><button key={m} onClick={()=>setRzp(r=>({...r,mode:m}))} style={{...G.btn,flex:1,justifyContent:"center",background:rzp.mode===m?c+"20":C.s2,color:rzp.mode===m?c:C.muted3,border:`1px solid ${rzp.mode===m?c+"50":C.border}`,padding:"8px 4px",fontSize:10,fontWeight:rzp.mode===m?700:400}}>{l}</button>)}</div>
        </div>
        <div>
          <label style={G.label}>Currency</label>
          <select value={rzp.currency} onChange={e=>setRzp(c=>({...c,currency:e.target.value}))} style={{...G.input,cursor:"pointer"}}><option>INR</option><option>USD</option></select>
        </div>
        <div>
          <label style={G.label}>Options</label>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.s2,borderRadius:8,padding:"6px 11px"}}><span style={{fontSize:10,color:C.muted3}}>Auto-capture</span><Toggle on={rzp.autoCapture} onChange={()=>setRzp(c=>({...c,autoCapture:!c.autoCapture}))}/></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.s2,borderRadius:8,padding:"6px 11px"}}><span style={{fontSize:10,color:C.muted3}}>Send receipt</span><Toggle on={rzp.sendReceipt} onChange={()=>setRzp(c=>({...c,sendReceipt:!c.sendReceipt}))}/></div>
          </div>
        </div>
      </div>
      <div style={{background:C.s2,borderRadius:10,padding:"13px 16px",marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:C.muted2,marginBottom:9,textTransform:"uppercase",letterSpacing:1}}>Required Webhook Events — Enable in Razorpay Dashboard</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
          {["payment.captured","payment.failed","subscription.activated","subscription.cancelled","refund.created"].map(e=><div key={e} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div style={{width:5,height:5,borderRadius:"50%",background:C.blue,flexShrink:0}}/><span style={{fontFamily:"monospace",fontSize:10,color:C.muted3}}>{e}</span></div>)}
        </div>
        <div style={{marginTop:10,padding:"8px 11px",background:"rgba(75,141,248,.08)",borderRadius:8,fontSize:10,color:C.blue}}>Webhook URL: <span style={{fontFamily:"monospace"}}>https://api.fuelos.in/webhooks/razorpay</span></div>
      </div>
      <div style={{background:`linear-gradient(135deg,rgba(75,141,248,.08),rgba(245,166,35,.05))`,border:`1px solid rgba(75,141,248,.18)`,borderRadius:10,padding:"13px 16px",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.blue,marginBottom:10}}>⚡ Auto Plan Activation — How It Works</div>
        <FlowStep n="1" text="Owner selects plan → Razorpay checkout opens with pre-computed amount (base + 18% GST − pro-rata credit − coupons)"/>
        <FlowStep n="2" text="Payment captured → Razorpay fires payment.captured webhook to FuelOS backend immediately"/>
        <FlowStep n="3" text="Backend verifies HMAC-SHA256 signature using Webhook Secret — rejects if signature mismatch"/>
        <FlowStep n="4" text="Owner record updated: plan, billing, startDate, endDate → nozzle/pump limits enforced instantly"/>
        <FlowStep n="5" text="WhatsApp confirmation sent + email receipt dispatched → Owner dashboard reflects new plan in real time"/>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={testRzpConn} disabled={testingRzp} style={{...G.btn,background:rzpTested?C.greenDim:testingRzp?C.s3:C.blueDim,color:rzpTested?C.green:testingRzp?C.muted:C.blue,border:`1px solid ${rzpTested?"rgba(0,229,179,.3)":"rgba(75,141,248,.3)"}`,padding:"9px 18px",fontSize:10}}>
          {testingRzp?"⏳ Testing…":rzpTested?"✓ Connection OK":"🧪 Test Connection"}
        </button>
        <button onClick={()=>{setRzp(c=>({...c,saved:true}));flash("✓ Razorpay configuration saved and active");}} style={{...G.btn,background:rzp.saved?C.greenDim:`linear-gradient(90deg,${C.blue},rgba(75,141,248,.8))`,color:rzp.saved?C.green:"#fff",fontWeight:700,flex:1,justifyContent:"center",fontSize:11,border:rzp.saved?`1px solid rgba(0,229,179,.3)`:"none"}}>
          {rzp.saved?"✓ Razorpay Configured & Active":"Save & Activate Razorpay →"}
        </button>
      </div>
    </div>
  </div>}

  {/* WHATSAPP */}
  {integTab==="whatsapp"&&<div style={{...G.card}}>
    <div style={{padding:"15px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:40,height:40,borderRadius:10,background:C.greenDim,display:"grid",placeItems:"center",fontSize:20}}>💬</div><div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:C.green}}>WhatsApp Business API</div><div style={{fontSize:10,color:C.muted3}}>Shift alerts · Payment receipts · Machine test results · Tank warnings</div></div></div>
      <IntegBadge saved={wa.saved}/>
    </div>
    <div style={{padding:"18px 20px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <label style={G.label}>Provider</label>
          <select value={wa.provider} onChange={e=>setWa(c=>({...c,provider:e.target.value}))} style={{...G.input,cursor:"pointer"}}>
            <option value="meta">Meta Cloud API (Official)</option>
            <option value="twilio">Twilio WhatsApp</option>
            <option value="wati">WATI</option>
            <option value="interakt">Interakt</option>
            <option value="gupshup">Gupshup</option>
          </select>
        </div>
        <CfgInput label="Business Phone Number" hint="Include country code e.g. +91XXXXXXXXXX" value={wa.waNumber} onChange={e=>setWa(c=>({...c,waNumber:e.target.value}))} placeholder="+91XXXXXXXXXX"/>
      </div>
      {wa.provider==="meta"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <CfgInput label="Permanent Access Token" hint="Meta Business Suite → WhatsApp API" type="password" value={wa.apiKey} onChange={e=>setWa(c=>({...c,apiKey:e.target.value}))} placeholder="EAAxxxxx..."/>
        <CfgInput label="Phone Number ID" hint="Meta for Developers → WhatsApp → Phone Numbers" value={wa.phoneNumberId} onChange={e=>setWa(c=>({...c,phoneNumberId:e.target.value}))} placeholder="12345678"/>
        <CfgInput label="WABA ID" hint="WhatsApp Business Account ID" value={wa.wabaId} onChange={e=>setWa(c=>({...c,wabaId:e.target.value}))} placeholder="98765432"/>
        <CfgInput label="Namespace" value={wa.namespace} onChange={e=>setWa(c=>({...c,namespace:e.target.value}))} placeholder="fuelos_notifications"/>
      </div>}
      {wa.provider==="twilio"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <CfgInput label="Account SID" value={wa.twAccountSid} onChange={e=>setWa(c=>({...c,twAccountSid:e.target.value}))} placeholder="ACxxxxxxxx"/>
        <CfgInput label="Auth Token" type="password" value={wa.twAuthToken} onChange={e=>setWa(c=>({...c,twAuthToken:e.target.value}))} placeholder="••••••••"/>
        <CfgInput label="From (Twilio WA Number)" value={wa.twFrom} onChange={e=>setWa(c=>({...c,twFrom:e.target.value}))} placeholder="whatsapp:+14155238886"/>
      </div>}
      {["wati","interakt","gupshup"].includes(wa.provider)&&<CfgInput label={wa.provider.charAt(0).toUpperCase()+wa.provider.slice(1)+" API Key"} hint={`From your ${wa.provider} dashboard → Integrations`} type="password" value={wa.watiKey} onChange={e=>setWa(c=>({...c,watiKey:e.target.value}))} placeholder="sk_..."/>}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:C.muted2,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Message Templates</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["payment","💳 Payment Confirmed"],["shift","📋 Shift Submitted"],["alert","⚠ Alert"],["test","🔬 Machine Test"]].map(([k,label])=><div key={k} style={{background:C.s2,borderRadius:9,padding:"12px 13px"}}>
            <div style={{fontSize:9,color:C.muted2,marginBottom:6,display:"flex",justifyContent:"space-between"}}><span style={{textTransform:"uppercase",letterSpacing:1}}>{label}</span><span style={{color:C.teal,fontSize:8}}>{"{{plan}} {{date}} {{amount}}"}</span></div>
            <textarea value={wa.templates[k]} onChange={e=>setWa(c=>({...c,templates:{...c.templates,[k]:e.target.value}}))} style={{...G.input,height:72,resize:"vertical",fontFamily:"'DM Mono',monospace",fontSize:10,lineHeight:1.5}} onFocus={e=>e.target.style.borderColor=C.green} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["Total Sent",waLog.length,C.muted3],["Delivered",totalWaDel,C.green],["Failed",totalWaFail,totalWaFail>0?C.red:C.muted3],["Rate",waLog.length?Math.round(totalWaDel/waLog.length*100)+"%":"—",C.blue]].map(([l,v,c])=><div key={l} style={{background:C.s2,borderRadius:9,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:8,color:C.muted3,marginBottom:2}}>{l}</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:c}}>{v}</div></div>)}
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={testWaConn} disabled={testingWa} style={{...G.btn,background:waTested?C.greenDim:testingWa?C.s3:C.greenDim,color:waTested?C.green:testingWa?C.muted:C.green,border:`1px solid rgba(0,229,179,.3)`,padding:"9px 18px",fontSize:10}}>
          {testingWa?"⏳ Sending…":waTested?"✓ Message Sent":"📱 Send Test Message"}
        </button>
        <button onClick={()=>{setWa(c=>({...c,saved:true}));flash("✓ WhatsApp configured — messages will be sent automatically on all events");}} style={{...G.btn,background:wa.saved?C.greenDim:`linear-gradient(90deg,${C.green},rgba(0,229,179,.8))`,color:wa.saved?C.green:"#000",fontWeight:700,flex:1,justifyContent:"center",fontSize:11,border:wa.saved?`1px solid rgba(0,229,179,.3)`:"none"}}>
          {wa.saved?"✓ WhatsApp Configured & Active":"Save & Activate WhatsApp →"}
        </button>
      </div>
    </div>
  </div>}

  {/* EMAIL */}
  {integTab==="email"&&<div style={{...G.card}}>
    <div style={{padding:"15px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:40,height:40,borderRadius:10,background:C.purpleDim,display:"grid",placeItems:"center",fontSize:20}}>📧</div><div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:C.purple}}>Email / SMTP</div><div style={{fontSize:10,color:C.muted3}}>Payment receipts · Renewal reminders · Shift reports · Alert emails</div></div></div>
      <IntegBadge saved={eml.saved}/>
    </div>
    <div style={{padding:"18px 20px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><label style={G.label}>Provider</label><select value={eml.provider} onChange={e=>setEml(c=>({...c,provider:e.target.value}))} style={{...G.input,cursor:"pointer"}}><option value="smtp">Custom SMTP</option><option value="sendgrid">SendGrid</option><option value="ses">Amazon SES</option><option value="mailgun">Mailgun</option></select></div>
        <CfgInput label="From Address" value={eml.from} onChange={e=>setEml(c=>({...c,from:e.target.value}))} placeholder="noreply@fuelos.in"/>
        {eml.provider==="smtp"&&<><CfgInput label="SMTP Host" value={eml.host} onChange={e=>setEml(c=>({...c,host:e.target.value}))} placeholder="smtp.gmail.com"/><CfgInput label="Port" value={eml.port} onChange={e=>setEml(c=>({...c,port:e.target.value}))} placeholder="587"/><CfgInput label="Username / Email" value={eml.user} onChange={e=>setEml(c=>({...c,user:e.target.value}))} placeholder="user@gmail.com"/><CfgInput label="App Password" hint="Use App Password for Gmail — not your main Google password" type="password" value={eml.pass} onChange={e=>setEml(c=>({...c,pass:e.target.value}))} placeholder="••••••••"/></>}
        {eml.provider!=="smtp"&&<CfgInput label="API Key" type="password" value={eml.user} onChange={e=>setEml(c=>({...c,user:e.target.value}))} placeholder="SG.xxx..."/>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.s2,borderRadius:9,padding:"9px 14px",marginBottom:14}}><span style={{fontSize:11,color:C.muted3}}>Use TLS/SSL (recommended)</span><Toggle on={eml.secure} onChange={()=>setEml(c=>({...c,secure:!c.secure}))}/></div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>flash("📧 Test email sent to admin@fuelos.in")} style={{...G.btn,background:C.purpleDim,color:C.purple,border:`1px solid rgba(167,139,250,.3)`,padding:"9px 18px",fontSize:10}}>📧 Send Test Email</button>
        <button onClick={()=>{setEml(c=>({...c,saved:true}));flash("✓ Email configuration saved");}} style={{...G.btn,background:eml.saved?C.greenDim:C.purple,color:eml.saved?C.green:"#fff",fontWeight:700,flex:1,justifyContent:"center",border:eml.saved?`1px solid rgba(0,229,179,.3)`:"none"}}>{eml.saved?"✓ Email Configured":"Save Email Config →"}</button>
      </div>
    </div>
  </div>}

  {/* SMS */}
  {integTab==="sms"&&<div style={{...G.card}}>
    <div style={{padding:"15px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:40,height:40,borderRadius:10,background:C.accentDim,display:"grid",placeItems:"center",fontSize:20}}>📱</div><div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:C.accent}}>SMS / OTP API</div><div style={{fontSize:10,color:C.muted3}}>OTP for admin login · Fallback alerts when WhatsApp unavailable</div></div></div>
      <IntegBadge saved={sms.saved}/>
    </div>
    <div style={{padding:"18px 20px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><label style={G.label}>Provider</label><select value={sms.provider} onChange={e=>setSms(c=>({...c,provider:e.target.value}))} style={{...G.input,cursor:"pointer"}}><option value="msg91">MSG91</option><option value="twilio">Twilio SMS</option><option value="textlocal">TextLocal</option><option value="fast2sms">Fast2SMS</option></select></div>
        <CfgInput label="API Key" hint={`From your ${sms.provider} dashboard`} type="password" value={sms.apiKey} onChange={e=>setSms(c=>({...c,apiKey:e.target.value}))} placeholder="••••••••"/>
        <CfgInput label="Sender ID" hint="6-char DLT-registered alphanumeric ID" value={sms.senderId} onChange={e=>setSms(c=>({...c,senderId:e.target.value}))} placeholder="FUELOS"/>
        <CfgInput label="DLT Entity ID" hint="Required by TRAI for all Indian operators" value={sms.dltId} onChange={e=>setSms(c=>({...c,dltId:e.target.value}))} placeholder="1234567890"/>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>flash("📱 Test OTP sent")} style={{...G.btn,background:C.accentDim,color:C.accent,border:`1px solid rgba(245,166,35,.3)`,padding:"9px 18px",fontSize:10}}>📱 Send Test OTP</button>
        <button onClick={()=>{setSms(c=>({...c,saved:true}));flash("✓ SMS configuration saved");}} style={{...G.btn,background:sms.saved?C.greenDim:C.accent,color:sms.saved?C.green:"#000",fontWeight:700,flex:1,justifyContent:"center",border:sms.saved?`1px solid rgba(0,229,179,.3)`:"none"}}>{sms.saved?"✓ SMS Configured":"Save SMS Config →"}</button>
      </div>
    </div>
  </div>}
</div>}

{/* ── ALL PUMPS ── */}
{tab==="pumps"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="⛽" title="All Pumps" sub={`${db.pumps.length} pumps · ${db.nozzles.length} nozzles · ${[...new Set(db.pumps.map(p=>p.state))].length} states`}/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
    <Kpi label="Total Pumps" value={db.pumps.length} sub={`${db.pumps.filter(p=>p.status==="Active").length} active`} accent={C.blue} icon="⛽"/>
    <Kpi label="Nozzles" value={db.nozzles.length} accent={C.green} icon="🔧"/>
    <Kpi label="Staff" value={db.managers.length+db.operators.length} sub={`${db.managers.length} mgr`} accent={C.purple} icon="👥"/>
    <Kpi label="States" value={[...new Set(db.pumps.map(p=>p.state))].length} accent={C.teal} icon="🗺"/>
  </div>
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><tr>{["Pump","Owner","Plan","Location","Nozzles","7d Revenue","Status"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead>
      <tbody>{db.pumps.map((pump,i)=>{
        const owner=db.owners.find(o=>o.id===pump.ownerId);
        const pNoz=db.nozzles.filter(n=>n.pumpId===pump.id);
        const pRev=db.sales.filter(s=>s.pumpId===pump.id).reduce((s,d)=>s+d.petrol+d.diesel+d.cng,0);
        return <tr key={pump.id}>
          <td style={{...G.td,fontWeight:700,color:pumpColors[i%pumpColors.length]}}>{pump.shortName}<div style={{fontSize:9,color:C.muted3}}>{pump.name}</div></td>
          <td style={{...G.td,fontSize:11}}>{owner?.name||"—"}</td>
          <td style={G.td}><span style={{...G.badge,background:PLANS[owner?.plan]?.color+"18",color:PLANS[owner?.plan]?.color,fontSize:8}}>{PLANS[owner?.plan]?.icon} {owner?.plan}</span></td>
          <td style={{...G.td,fontSize:10,color:C.muted3}}>{pump.city}, {pump.state}</td>
          <td style={G.td}>{pNoz.length}</td>
          <td style={{...G.td,fontWeight:700,color:C.accent}}>{fmtL(pRev)}</td>
          <td style={G.td}><Sb s={pump.status}/></td>
        </tr>;
      })}</tbody>
    </table>
  </div>
</div>}

{/* ── MACHINE TESTS ── */}
{tab==="tests"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="🔬" title="Platform Machine Tests"/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
    <Kpi label="Total Tests" value={(db.machineTests||[]).length} sub={`${(db.machineTests||[]).filter(t=>t.result==="Pass").length} pass`} accent={C.teal} icon="🔬"/>
    <Kpi label="Extracted" value={(db.machineTests||[]).reduce((s,t)=>s+t.qty,0).toFixed(1)+"L"} accent={C.blue} icon="🧪"/>
    <Kpi label="Failures" value={(db.machineTests||[]).filter(t=>t.result==="Fail").length} accent={(db.machineTests||[]).filter(t=>t.result==="Fail").length>0?C.red:C.green} icon="⚠"/>
    <Kpi label="Today" value={(db.machineTests||[]).filter(t=>t.date===todayS()).length} sub={`${failedTestsToday.length} issues`} accent={failedTestsToday.length>0?C.red:C.green} icon="📅"/>
  </div>
  {failedTestsToday.length>0&&<div style={{background:C.redDim,border:`1px solid rgba(244,63,94,.2)`,borderRadius:11,padding:"13px 16px"}}>
    <div style={{fontWeight:700,color:C.red,fontSize:12,marginBottom:9}}>⚠ Today's Failures</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
      {failedTestsToday.map(t=>{const pump=db.pumps.find(p=>p.id===t.pumpId);return <div key={t.id} style={{background:"rgba(244,63,94,.08)",borderRadius:9,padding:"10px 13px"}}><div style={{fontWeight:700,color:C.red}}>{t.nozzleId} — {t.fuel}</div><div style={{fontSize:9,color:C.muted3}}>{pump?.shortName}</div><div style={{fontSize:10,color:C.warn,marginTop:3}}>{t.variance}ml variance</div></div>;})}
    </div>
  </div>}
  <MachineTestLog tests={db.machineTests||[]} nozzles={db.nozzles} pumps={db.pumps.map((p,i)=>({...p,_color:pumpColors[i%pumpColors.length]}))} showFilter={true}/>
</div>}

{/* ── ANALYTICS ── */}
{tab==="analytics"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="📈" title="Platform Analytics"/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
    {["Petrol","Diesel","CNG"].map(f=><Kpi key={f} label={`${f} Revenue (7d)`} value={fmtL(db.sales.reduce((s,d)=>s+(d[f.toLowerCase()]||0),0))} accent={FUEL.colors[f]} icon="⛽"/>)}
  </div>
  <div style={{...G.card,padding:18}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:13}}>Revenue by Fuel Type — All Pumps</div><BarChart data={aggregateSales(db.sales,null).map(d=>({label:d.date.slice(5),petrol:d.petrol,diesel:d.diesel,cng:d.cng}))} keys={["petrol","diesel","cng"]} colors={[C.blue,C.accent,C.green]}/></div>
  <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Owner","Plan","Pumps","Petrol","Diesel","CNG","Total","MRR","WA Rate"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead><tbody>{ownerStats.map(o=>{const oS=db.sales.filter(x=>x.ownerId===o.id);const[p,d,c]=[oS.reduce((s,x)=>s+x.petrol,0),oS.reduce((s,x)=>s+x.diesel,0),oS.reduce((s,x)=>s+x.cng,0)];return <tr key={o.id}><td style={{...G.td,fontWeight:700}}>{o.name}</td><td style={G.td}><span style={{...G.badge,background:PLANS[o.plan]?.color+"18",color:PLANS[o.plan]?.color,fontSize:8}}>{PLANS[o.plan]?.icon} {o.plan}</span></td><td style={G.td}>{o.pumps}</td><td style={{...G.td,color:C.blue,fontWeight:600}}>{fmtL(p)}</td><td style={{...G.td,color:C.accent,fontWeight:600}}>{fmtL(d)}</td><td style={{...G.td,color:C.green,fontWeight:600}}>{fmtL(c)}</td><td style={{...G.td,fontFamily:"'Syne',sans-serif",fontWeight:800,color:C.accent}}>{fmtL(p+d+c)}</td><td style={{...G.td,color:C.purple,fontWeight:700}}>{fmt(PLANS[o.plan]?.price||0)}</td><td style={G.td}><span style={{fontSize:10,color:o.waRate>95?C.green:o.waRate>80?C.warn:C.red,fontWeight:700}}>{o.waRate}%</span></td></tr>;})}
    </tbody></table>
  </div>
</div>}

{/* ── SYSTEM HEALTH ── */}
{tab==="health"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="🖥" title="System Health"/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
    {(db.services||[]).map((svc,i)=>{const col=svc.status==="Online"?C.green:svc.status==="Degraded"?C.warn:C.red;return <div key={svc.name} style={{...G.card,padding:16,borderLeft:`3px solid ${col}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontWeight:700,fontSize:13}}>{svc.name}</div><Sb s={svc.status}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><div style={{fontSize:9,color:C.muted3}}>Latency</div><div style={{fontSize:18,fontWeight:800,color:col}}>{svc.latency!=null?svc.latency+"ms":"—"}</div></div><div><div style={{fontSize:9,color:C.muted3}}>Uptime</div><div style={{fontSize:18,fontWeight:800,color:svc.uptime>99?C.green:svc.uptime>95?C.warn:C.red}}>{svc.uptime}%</div></div></div>{svc.status!=="Online"&&<button onClick={()=>{setDb(d=>({...d,services:d.services.map((s,j)=>j===i?{...s,status:"Online",latency:45}:s)}));flash("✓ "+svc.name+" restored");}} style={{...G.btn,background:C.green,color:"#000",padding:"5px 13px",fontSize:10,marginTop:10,fontWeight:700}}>Force Restore</button>}</div>;})}
  </div>
</div>}

{/* ── AUDIT LOG ── */}
{tab==="audit"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="📋" title="Audit Log"/>
  <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["User","Role","Action","Time","IP"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead><tbody>{(db.auditLog||[]).map(l=><tr key={l.id}><td style={{...G.td,fontSize:10,color:C.muted3}}>{l.user}</td><td style={G.td}><span style={{...G.badge,background:l.role==="Admin"?C.purpleDim:l.role==="Owner"?C.accentDim:l.role==="Manager"?C.blueDim:C.greenDim,color:l.role==="Admin"?C.purple:l.role==="Owner"?C.accent:l.role==="Manager"?C.blue:C.green,fontSize:9}}>{l.role}</span></td><td style={{...G.td,fontSize:11}}>{l.action}</td><td style={{...G.td,color:C.muted3,fontSize:10}}>{l.time}</td><td style={{...G.td,fontFamily:"monospace",fontSize:9,color:C.muted}}>{l.ip}</td></tr>)}</tbody></table></div>
</div>}

{/* ── COUPONS ── */}
{tab==="coupons"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="🎟" title="Coupons" right={<button onClick={()=>setShowCouponForm(!showCouponForm)} style={{...G.btn,background:C.purple,color:"#fff",fontWeight:700}}>+ New Coupon</button>}/>
  {showCouponForm&&<div style={{...G.card,padding:19,borderColor:"rgba(167,139,250,.3)"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:13}}>
      <div><label style={G.label}>Code</label><input value={couponF.code} onChange={e=>setCouponF(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="PUMP25" style={G.input}/></div>
      <div><label style={G.label}>Type</label><select value={couponF.type} onChange={e=>setCouponF(f=>({...f,type:e.target.value}))} style={{...G.input,cursor:"pointer"}}><option value="flat">Flat ₹</option><option value="percent">Percent %</option></select></div>
      <div><label style={G.label}>Discount Value</label><input type="number" value={couponF.discount} onChange={e=>setCouponF(f=>({...f,discount:e.target.value}))} style={G.input}/></div>
      <div><label style={G.label}>Max Uses</label><input type="number" value={couponF.maxUses} onChange={e=>setCouponF(f=>({...f,maxUses:e.target.value}))} style={G.input}/></div>
    </div>
    <button onClick={()=>{if(!couponF.code||!couponF.discount)return;setDb(d=>({...d,coupons:[...d.coupons,{id:"CPN"+rid(),code:couponF.code,discount:parseInt(couponF.discount),type:couponF.type,uses:0,maxUses:parseInt(couponF.maxUses)||100,status:"Active"}]}));flash("✓ Coupon "+couponF.code+" created");setCouponF({code:"",discount:"",type:"flat",maxUses:100});setShowCouponForm(false);}} style={{...G.btn,background:C.purple,color:"#fff",fontWeight:700}}>Create Coupon →</button>
  </div>}
  <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Code","Type","Discount","Uses","Max","Left","Status","Action"].map(h=><th key={h} style={G.th}>{h}</th>)}</tr></thead><tbody>{(db.coupons||[]).map(c=><tr key={c.id}><td style={{...G.td,fontFamily:"monospace",fontWeight:700,color:C.purple}}>{c.code}</td><td style={G.td}><span style={{...G.badge,background:C.s3,color:C.muted3,fontSize:9}}>{c.type}</span></td><td style={{...G.td,fontWeight:700,color:C.accent}}>{c.type==="flat"?fmt(c.discount):c.discount+"%"}</td><td style={G.td}>{c.uses}</td><td style={G.td}>{c.maxUses}</td><td style={G.td}><span style={{fontWeight:700,color:c.maxUses-c.uses>10?C.green:c.maxUses-c.uses>0?C.warn:C.red}}>{c.maxUses-c.uses}</span></td><td style={G.td}><Sb s={c.status}/></td><td style={G.td}><button onClick={()=>{setDb(d=>({...d,coupons:d.coupons.map(x=>x.id===c.id?{...x,status:x.status==="Active"?"Inactive":"Active"}:x)}));flash("Coupon updated");}} style={{...G.btn,background:C.s3,color:C.muted2,border:`1px solid ${C.border}`,padding:"3px 10px",fontSize:9}}>{c.status==="Active"?"Disable":"Enable"}</button></td></tr>)}</tbody></table></div>
</div>}

{/* ── ALERTS ── */}
{tab==="alerts"&&<div style={{display:"flex",flexDirection:"column",gap:15}}>
  <H icon="🔔" title="Platform Alerts"/>
  <div style={{display:"flex",flexDirection:"column",gap:9}}>
    {[{c:C.red,icon:"🔴",msg:"Diesel tank critical — Koregaon Park: only 2,400L remaining",sub:"Rajesh Sharma · P1 · Act immediately",time:"10 min ago"},{c:C.red,icon:"🔴",msg:"Machine test FAIL: N-08 Hinjewadi — calibration required",sub:"Rajesh Sharma · P3",time:"1 hr ago"},{c:C.red,icon:"🔴",msg:`Payment failed × 2 for Dinesh Rao — Starter plan not active`,sub:"UPI declined · OTP timeout — retry recommended",time:"2 days ago"},{c:C.warn,icon:"🟡",msg:"Subscription expiring in 7 days: Rajesh Sharma — Pro Plan",sub:"Due: Mar 1, 2025 — send renewal reminder",time:"6 days ago"},{c:C.warn,icon:"🟡",msg:"WhatsApp delivery failed for Anil Gupta — 3 messages undelivered",sub:"Check WhatsApp API key in Integrations",time:"1 day ago"},{c:C.blue,icon:"🔵",msg:"Morning shift submitted — Kothrud by Suresh Naidu · ₹98,450",sub:"Rajesh Sharma · P2",time:"2 hr ago"},{c:C.green,icon:"🟢",msg:"Enterprise plan renewed — Meena Krishnan · Valid till Apr 1 2025",sub:"Payment captured · WhatsApp sent · Plan activated",time:"21 days ago"}].map((a,i)=><div key={i} style={{...G.card,padding:"12px 16px",display:"flex",gap:12,alignItems:"flex-start",borderLeft:`3px solid ${a.c}`}}>
      <span style={{fontSize:16,flexShrink:0}}>{a.icon}</span>
      <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{a.msg}</div><div style={{fontSize:10,color:C.muted3,marginTop:2}}>{a.sub}</div></div>
      <div style={{fontSize:9,color:C.muted,flexShrink:0}}>{a.time}</div>
    </div>)}
  </div>
</div>}

      </div>
    </div>
  </div>;
};
// ═══════════════════════════════════════════════════════════
// LOGIN SCREENS
// ═══════════════════════════════════════════════════════════
const MainLogin=({db,onLogin,onAdminLink})=>{
  const[role,setRole]=useState(null);
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  const[showPass,setShowPass]=useState(false);
  const ROLES=[
    {k:"owner",icon:"👤",label:"Owner",color:C.accent,desc:"Manage all your pumps — consolidated dashboard, analytics, billing, staff & reports"},
    {k:"manager",icon:"🗂",label:"Manager",color:C.blue,desc:"Daily pump ops — nozzle entries, cash collection, shift reports & attendance"},
    {k:"operator",icon:"⛽",label:"Operator",color:C.green,desc:"Your shift — machine tests, nozzle readings & payment for assigned nozzles"},
  ];
  const DEMOS={owner:{e:"rajesh@sharma.com",p:"owner123"},manager:{e:"vikram@sharma.com",p:"mgr123"},operator:{e:"amit@sharma.com",p:"op123"}};
  const login=()=>{
    setErr("");setLoading(true);
    setTimeout(()=>{
      const src={owner:db.owners,manager:db.managers,operator:db.operators}[role];
      const user=src?.find(u=>u.email===email&&u.password===pass);
      if(user)onLogin(role,user);
      else{setErr("Invalid credentials. Try the demo.");setLoading(false);}
    },700);
  };
  const rd=ROLES.find(r=>r.k===role);
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",padding:24,overflow:"hidden",position:"relative"}}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{position:"absolute",top:"-15%",right:"-8%",width:480,height:480,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,166,35,.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-10%",left:"-5%",width:380,height:380,borderRadius:"50%",background:"radial-gradient(circle,rgba(75,141,248,.05) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:44,letterSpacing:-2,lineHeight:1}}>⛽ Fuel<span style={{color:C.accent}}>OS</span></div>
        <div style={{fontSize:13,color:C.muted3,marginTop:9}}>India's Most Advanced Multi-Pump Management Platform</div>
        <div style={{display:"flex",justifyContent:"center",gap:11,marginTop:13,flexWrap:"wrap"}}>
          {["Multi-Pump","Consolidated Reports","Machine Testing","GST Ready","Razorpay"].map(t=><span key={t} style={{fontSize:10,color:C.muted,background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 10px"}}>{t}</span>)}
        </div>
      </div>
      {!role?(
        <div style={{width:"100%",maxWidth:860}}>
          <div style={{fontSize:12,color:C.muted3,textAlign:"center",marginBottom:19}}>Select your role to sign in</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
            {ROLES.map(r=>(
              <div key={r.k} onClick={()=>{setRole(r.k);setEmail(DEMOS[r.k].e);setPass(DEMOS[r.k].p);setErr("");}} style={{...G.card,padding:28,cursor:"pointer",textAlign:"center",transition:"all .22s",position:"relative",overflow:"hidden"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=r.color;e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow="0 18px 50px rgba(0,0,0,.4)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:r.color}}/>
                <div style={{fontSize:46,marginBottom:14}}>{r.icon}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:21,color:r.color,marginBottom:9}}>{r.label}</div>
                <div style={{fontSize:11,color:C.muted3,lineHeight:1.75,marginBottom:18}}>{r.desc}</div>
                <div style={{padding:"9px",background:`${r.color}18`,borderRadius:8,fontSize:11,color:r.color,fontWeight:700}}>Sign in as {r.label} →</div>
              </div>
            ))}
          </div>
          {/* Demo credentials note */}
          <div style={{marginTop:28,background:C.s1,border:`1px solid ${C.border}`,borderRadius:11,padding:"14px 18px"}}>
            <div style={{fontSize:10,color:C.muted2,fontWeight:700,marginBottom:8}}>🔑 Demo Credentials</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {ROLES.map(r=><div key={r.k} style={{fontSize:9,color:C.muted3}}>
                <span style={{color:r.color,fontWeight:700}}>{r.label}:</span> {DEMOS[r.k].e} / {DEMOS[r.k].p}
                {r.k==="owner"&&<div style={{color:C.muted,marginTop:2}}>3 pumps · Pro plan · Multi-pump dashboard</div>}
                {r.k==="manager"&&<div style={{color:C.muted,marginTop:2}}>Koregaon Park pump</div>}
                {r.k==="operator"&&<div style={{color:C.muted,marginTop:2}}>N-01, N-02 assigned</div>}
              </div>)}
            </div>
          </div>
          <div style={{textAlign:"center",marginTop:32}}><span onClick={onAdminLink} style={{fontSize:9,color:C.s3,cursor:"pointer",letterSpacing:1,userSelect:"none",transition:"color .3s"}} onMouseEnter={e=>e.target.style.color=C.muted} onMouseLeave={e=>e.target.style.color=C.s3}>· admin ·</span></div>
        </div>
      ):(
        <div style={{width:415}}>
          <button onClick={()=>{setRole(null);setErr("");}} style={{...G.btn,background:"transparent",color:C.muted2,padding:"6px 0",marginBottom:18,fontSize:12}}>← Back</button>
          <div style={{...G.card,padding:28,position:"relative"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:rd?.color,borderRadius:"14px 14px 0 0"}}/>
            <div style={{display:"flex",gap:11,alignItems:"center",marginBottom:22}}><span style={{fontSize:30}}>{rd?.icon}</span><div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17}}>{rd?.label} Sign In</div><div style={{fontSize:10,color:C.muted,marginTop:1}}>app.fuelos.in/{role}/login</div></div></div>
            <div style={{marginBottom:12}}><label style={G.label}>Email</label><input style={G.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} onFocus={e=>e.target.style.borderColor=rd?.color} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            <div style={{marginBottom:17}}><label style={G.label}>Password</label><div style={{position:"relative"}}><input style={{...G.input,paddingRight:38}} type={showPass?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} onFocus={e=>e.target.style.borderColor=rd?.color} onBlur={e=>e.target.style.borderColor=C.border}/><button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:C.muted,fontSize:13}}>{showPass?"🙈":"👁"}</button></div></div>
            {err&&<div style={{fontSize:11,color:C.red,marginBottom:12,padding:"8px 12px",background:"rgba(244,63,94,.07)",borderRadius:8,border:`1px solid rgba(244,63,94,.2)`}}>⚠ {err}</div>}
            <button onClick={login} disabled={loading} style={{...G.btn,width:"100%",justifyContent:"center",background:rd?.color,color:role==="manager"?"#fff":"#000",padding:12,fontSize:13,fontWeight:700}}>{loading?"Signing in…":"Sign In →"}</button>
            <div style={{marginTop:13,background:C.s2,borderRadius:8,border:`1px solid ${C.border}`,padding:"9px 13px",fontSize:10,color:C.muted,lineHeight:1.8}}><strong style={{color:C.muted2}}>Demo:</strong> {DEMOS[role]?.e} / {DEMOS[role]?.p}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminLogin=({onLogin,onBack})=>{
  const[step,setStep]=useState("creds");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[otp,setOtp]=useState("");
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  const go=()=>{
    setErr("");setLoading(true);
    setTimeout(()=>{
      if(email==="admin@fuelos.in"&&pass==="admin2025"){setStep("otp");setLoading(false);}
      else{setErr("Invalid admin credentials");setLoading(false);}
    },700);
  };
  const verifyOtp=()=>{
    if(otp==="123456"||otp.length===6){onLogin();}
    else setErr("Invalid OTP");
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace"}}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{width:420}}>
        <button onClick={onBack} style={{...G.btn,background:"transparent",color:C.muted2,padding:"6px 0",marginBottom:18,fontSize:12}}>← Back to main login</button>
        <div style={{...G.card,padding:28,position:"relative"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.purple},${C.blue})`,borderRadius:"14px 14px 0 0"}}/>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:19,marginBottom:4}}>🛡 Admin Portal</div>
          <div style={{fontSize:10,color:C.muted,marginBottom:22}}>Restricted access · FuelOS Platform Admin</div>
          {step==="creds"&&<>
            <div style={{marginBottom:12}}><label style={G.label}>Admin Email</label><input style={G.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@fuelos.in" onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            <div style={{marginBottom:17}}><label style={G.label}>Password</label><input style={G.input} type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            {err&&<div style={{fontSize:11,color:C.red,marginBottom:12,padding:"8px 12px",background:"rgba(244,63,94,.07)",borderRadius:8}}>⚠ {err}</div>}
            <button onClick={go} disabled={loading} style={{...G.btn,width:"100%",justifyContent:"center",background:C.purple,color:"#fff",padding:12,fontWeight:700}}>{loading?"Verifying…":"Continue →"}</button>
            <div style={{marginTop:12,fontSize:10,color:C.muted,textAlign:"center"}}>Demo: admin@fuelos.in / admin2025</div>
          </>}
          {step==="otp"&&<>
            <div style={{textAlign:"center",marginBottom:19}}><div style={{fontSize:34,marginBottom:9}}>📱</div><div style={{fontSize:12,color:C.muted3}}>OTP sent to registered mobile</div></div>
            <div style={{marginBottom:17}}><label style={G.label}>6-digit OTP</label><input style={{...G.input,textAlign:"center",fontSize:22,letterSpacing:8}} maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verifyOtp()}/></div>
            {err&&<div style={{fontSize:11,color:C.red,marginBottom:12,padding:"8px 12px",background:"rgba(244,63,94,.07)",borderRadius:8}}>⚠ {err}</div>}
            <button onClick={verifyOtp} style={{...G.btn,width:"100%",justifyContent:"center",background:C.purple,color:"#fff",padding:12,fontWeight:700}}>Verify OTP →</button>
            <div style={{marginTop:12,fontSize:10,color:C.muted,textAlign:"center"}}>Enter any 6 digits for demo</div>
          </>}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════
export default function App(){
  const[db,setDb]=useState(DB);
  const[view,setView]=useState("main"); // main | admin
  const[role,setRole]=useState(null);   // owner | manager | operator | admin
  const[user,setUser]=useState(null);
  const logout=()=>{setRole(null);setUser(null);setView("main");};

  if(view==="admin"&&!role)return <AdminLogin onLogin={()=>setRole("admin")} onBack={()=>setView("main")}/>;
  if(role==="admin")return <AdminDash onLogout={logout} db={db} setDb={setDb}/>;
  if(!role)return <MainLogin db={db} onLogin={(r,u)=>{setRole(r);setUser(u);}} onAdminLink={()=>setView("admin")}/>;
  if(role==="owner")return <OwnerDash owner={user} setOwner={u=>setUser(u)} db={db} setDb={setDb} onLogout={logout}/>;
  if(role==="manager")return <ManagerDash manager={user} db={db} setDb={setDb} onLogout={logout}/>;
  if(role==="operator")return <OperatorDash operator={user} db={db} setDb={setDb} onLogout={logout}/>;
  return null;
}

