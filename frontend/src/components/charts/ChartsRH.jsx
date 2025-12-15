// ChartsRH.jsx
import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card } from "./UIPrimitives"; // si tu as déjà ton composant Card

// Utilitaire pour convertir proprement une valeur numérique
const n = (v) => (isNaN(v) || v == null ? 0 : Number(v));

/* =========================================================
   1) FTE vs ETP par centre
========================================================= */
export const ChartFteEtpBar = ({ centres }) => {
  const rows = useMemo(() => {
    return centres.map(c => ({
      name: c.label,
      fte: n(c.fte_actuel),
      etp: n(c.etp_calcule),
    }))
    .sort((a,b)=>Math.max(b.fte,b.etp)-Math.max(a.fte,a.etp))
    .slice(0,20);
  }, [centres]);

  const option = useMemo(() => ({
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 10, right: 10, top: 30, bottom: 10, containLabel: true },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map(r=>r.name) },
    series: [
      { name:"ETP (besoin)", type:"bar", data:rows.map(r=>r.etp) },
      { name:"FTE (actuel)", type:"bar", data:rows.map(r=>r.fte) },
    ]
  }), [rows]);

  return (
    <Card title="Comparatif FTE vs ETP — Top 20 centres">
      <ReactECharts option={option} style={{height:420}}/>
    </Card>
  );
};

/* =========================================================
   2) Waterfall des écarts Δ
========================================================= */
export const ChartWaterfall = ({ centres }) => {
  const deltas = useMemo(() => {
    return centres.map(c=>{
      const d=(n(c.fte_actuel)-n(c.etp_calcule));
      return {name:c.label,delta:d};
    }).filter(d=>d.delta!==0)
      .sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))
      .slice(0,15);
  }, [centres]);

  const base=[], change=[]; let sum=0;
  deltas.forEach(d=>{ base.push(sum); change.push(d.delta); sum+=d.delta; });

  const option = {
    tooltip:{trigger:"axis"},
    grid:{left:10,right:10,top:30,bottom:10,containLabel:true},
    xAxis:{type:"category",data:deltas.map(d=>d.name)},
    yAxis:{type:"value",name:"Δ (FTE - ETP)"},
    series:[
      { type:"bar", stack:"total", itemStyle:{opacity:0}, data:base },
      { type:"bar", stack:"total", data:change, label:{show:true,position:"top"} }
    ]
  };

  return (
    <Card title="Waterfall des écarts — principaux contributeurs">
      <ReactECharts option={option} style={{height:420}}/>
    </Card>
  );
};

/* =========================================================
   3) Donut consolidé par poste
========================================================= */
export const ChartDonutPostes = ({ rows }) => {
  const option = useMemo(() => ({
    tooltip:{trigger:"item",formatter:"{b}: {c} ({d}%)"},
    legend:{type:"scroll",top:0},
    series:[{
      type:"pie",
      radius:["40%","70%"],
      data:rows.map(r=>({name:r.label,value:n(r.etp_total)})),
      label:{show:true,formatter:"{b}\n{d}%"}
    }]
  }), [rows]);

  return (
    <Card title="Répartition ETP total par poste (Consolidé)">
      <ReactECharts option={option} style={{height:400}}/>
    </Card>
  );
};

/* =========================================================
   4) Histogramme Δ
========================================================= */
export const ChartHistogram = ({ centres }) => {
  const data = useMemo(()=>{
    const deltas = centres.map(c=>n(c.fte_actuel)-n(c.etp_calcule)).filter(x=>!isNaN(x));
    if(deltas.length===0) return {edges:[],counts:[]};
    const min=Math.min(...deltas), max=Math.max(...deltas);
    const bins=10; const step=(max-min)/bins||1;
    const edges=Array.from({length:bins+1},(_,i)=>min+i*step);
    const counts=Array(bins).fill(0);
    deltas.forEach(v=>{
      const i=Math.min(bins-1,Math.floor((v-min)/step));
      counts[i]++;
    });
    return {edges,counts};
  },[centres]);

  const option={
    tooltip:{trigger:"axis"},
    grid:{left:10,right:10,top:30,bottom:10,containLabel:true},
    xAxis:{
      type:"category",
      data:data.edges.slice(0,-1).map((e,i)=>`${e.toFixed(1)}~${data.edges[i+1].toFixed(1)}`),
      axisLabel:{rotate:30}
    },
    yAxis:{type:"value",name:"Nb centres"},
    series:[{type:"bar",data:data.counts,label:{show:true,position:"top"}}]
  };

  return (
    <Card title="Distribution des écarts (Δ)">
      <ReactECharts option={option} style={{height:380}}/>
    </Card>
  );
};
