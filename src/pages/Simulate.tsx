import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Binary, ChevronRight } from 'lucide-react';

export default function Simulate() {
  const [patients, setPatients] = useState(140);
  const [arrivalWindow, setArrivalWindow] = useState(180);
  const [doctors, setDoctors] = useState(2);
  const [consultMins, setConsultMins] = useState(4);
  const [runs, setRuns] = useState(200);
  
  const [immPct, setImmPct] = useState(5);
  const [soonPct, setSoonPct] = useState(25);
  
  const [results, setResults] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = () => {
    setIsSimulating(true);
    
    setTimeout(() => {
      let stats = {
        fcfs: { imm: [] as number[], soon: [] as number[], routine: [] as number[] },
        opd: { imm: [] as number[], soon: [] as number[], routine: [] as number[], maxRoutine: 0 }
      };

      for (let run = 0; run < runs; run++) {
        let pts: any[] = [];
        for (let i = 0; i < patients; i++) {
          const r = Math.random() * 100;
          const priority = r < immPct ? 'Immediate' : r < (immPct + soonPct) ? 'Soon' : 'Routine';
          pts.push({
            id: i,
            arrival: Math.random() * arrivalWindow,
            priority,
            consultTime: Math.max(1, consultMins + (Math.random() * 2 - 1)),
          });
        }
        pts.sort((a, b) => a.arrival - b.arrival);

        // FCFS
        let fcfsDocs = Array(doctors).fill(0);
        for (const p of pts) {
          const docIdx = fcfsDocs.indexOf(Math.min(...fcfsDocs));
          const docFreeAt = fcfsDocs[docIdx];
          const start = Math.max(p.arrival, docFreeAt);
          const wait = start - p.arrival;
          fcfsDocs[docIdx] = start + p.consultTime;
          
          if (p.priority === 'Immediate') stats.fcfs.imm.push(wait);
          else if (p.priority === 'Soon') stats.fcfs.soon.push(wait);
          else stats.fcfs.routine.push(wait);
        }

        // OPD
        let opdDocs = Array(doctors).fill(0);
        let queue = [...pts];
        let opdTime = 0;
        
        while (queue.length > 0) {
          const docIdx = opdDocs.indexOf(Math.min(...opdDocs));
          opdTime = opdDocs[docIdx];
          
          let available = queue.filter(p => p.arrival <= opdTime);
          if (available.length === 0) {
            const nextArrival = Math.min(...queue.map(p => p.arrival));
            opdDocs[docIdx] = nextArrival;
            continue;
          }

          available.sort((a, b) => {
            const waitA = opdTime - a.arrival;
            const waitB = opdTime - b.arrival;
            const pA = (a.priority === 'Routine' && waitA >= 90) ? 'Soon' : a.priority;
            const pB = (b.priority === 'Routine' && waitB >= 90) ? 'Soon' : b.priority;
            
            const pLevel: any = { 'Immediate': 3, 'Soon': 2, 'Routine': 1 };
            if (pLevel[pA] !== pLevel[pB]) return pLevel[pB] - pLevel[pA];
            return a.arrival - b.arrival;
          });

          const p = available[0];
          queue = queue.filter(x => x.id !== p.id);
          
          const wait = opdTime - p.arrival;
          opdDocs[docIdx] = opdTime + p.consultTime;
          
          if (p.priority === 'Immediate') stats.opd.imm.push(wait);
          else if (p.priority === 'Soon') stats.opd.soon.push(wait);
          else {
            stats.opd.routine.push(wait);
            if (wait > stats.opd.maxRoutine) stats.opd.maxRoutine = wait;
          }
        }
      }

      const getMed = (arr: number[]) => {
        if (!arr.length) return 0;
        arr.sort((a, b) => a - b);
        return arr[Math.floor(arr.length / 2)];
      };
      const get90th = (arr: number[]) => {
        if (!arr.length) return 0;
        arr.sort((a, b) => a - b);
        return arr[Math.floor(arr.length * 0.9)];
      };

      setResults({
        chartData: [
          { name: 'Immediate (Med)', FCFS: getMed(stats.fcfs.imm), OPDFlow: getMed(stats.opd.imm) },
          { name: 'Immediate (90th)', FCFS: get90th(stats.fcfs.imm), OPDFlow: get90th(stats.opd.imm) },
          { name: 'Soon (Med)', FCFS: getMed(stats.fcfs.soon), OPDFlow: getMed(stats.opd.soon) },
          { name: 'Soon (90th)', FCFS: get90th(stats.fcfs.soon), OPDFlow: get90th(stats.opd.soon) },
          { name: 'Routine (Med)', FCFS: getMed(stats.fcfs.routine), OPDFlow: getMed(stats.opd.routine) },
          { name: 'Routine (90th)', FCFS: get90th(stats.fcfs.routine), OPDFlow: get90th(stats.opd.routine) },
        ],
        maxRoutineWait: stats.opd.maxRoutine
      });
      setIsSimulating(false);
    }, 100);
  };

  const handlePctChange = (type: string, val: number) => {
    if (type === 'imm') {
      if (val + soonPct > 100) setSoonPct(100 - val);
      setImmPct(val);
    } else {
      if (val + immPct > 100) setImmPct(100 - val);
      setSoonPct(val);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
      {/* ── LEFT: Inputs ── */}
      <div className="w-full md:w-[360px] shrink-0 space-y-6">
        <div className="page-header mb-0 border-none pb-0">
          <h1 className="page-title flex items-center gap-2">
            <Binary className="text-[#0E7C86]" size={22} /> Simulate
          </h1>
          <p className="page-subtitle mb-4">Monte Carlo simulation of OPD wait times</p>
        </div>

        <div className="card p-6 border-t-4 border-t-[#0E7C86]">
          <h2 className="text-sm font-black text-[#12324A] uppercase tracking-wide mb-6">Parameters</h2>
          
          <div className="space-y-5">
            <div>
              <label className="flex justify-between text-xs font-bold text-[#4A5B6B] mb-1.5">
                <span>Total Patients</span><span className="text-[#12324A] bg-[#F4F9FB] px-1.5 rounded">{patients}</span>
              </label>
              <input type="range" min="50" max="300" value={patients} onChange={e => setPatients(parseInt(e.target.value))} className="w-full accent-[#0E7C86]" />
            </div>
            
            <div>
              <label className="flex justify-between text-xs font-bold text-[#4A5B6B] mb-1.5">
                <span>Arrival Window (mins)</span><span className="text-[#12324A] bg-[#F4F9FB] px-1.5 rounded">{arrivalWindow}</span>
              </label>
              <input type="range" min="60" max="480" value={arrivalWindow} onChange={e => setArrivalWindow(parseInt(e.target.value))} className="w-full accent-[#0E7C86]" />
            </div>
            
            <div>
              <label className="flex justify-between text-xs font-bold text-[#4A5B6B] mb-1.5">
                <span>Doctors</span><span className="text-[#12324A] bg-[#F4F9FB] px-1.5 rounded">{doctors}</span>
              </label>
              <input type="range" min="1" max="10" value={doctors} onChange={e => setDoctors(parseInt(e.target.value))} className="w-full accent-[#0E7C86]" />
            </div>
            
            <div>
              <label className="flex justify-between text-xs font-bold text-[#4A5B6B] mb-1.5">
                <span>Mean Consult (mins)</span><span className="text-[#12324A] bg-[#F4F9FB] px-1.5 rounded">{consultMins}</span>
              </label>
              <input type="range" min="2" max="15" value={consultMins} onChange={e => setConsultMins(parseInt(e.target.value))} className="w-full accent-[#0E7C86]" />
            </div>
            
            <div className="pt-5 border-t border-[#D6E4EA]">
              <label className="block text-xs font-black text-[#12324A] uppercase tracking-wide mb-4">Acuity Mix</label>
              
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between text-[11px] font-bold text-[#C62F2F] mb-1">
                    <span>Immediate</span><span className="bg-[#FCE6E3] px-1.5 rounded">{immPct}%</span>
                  </label>
                  <input type="range" min="0" max="100" value={immPct} onChange={e => handlePctChange('imm', parseInt(e.target.value))} className="w-full accent-[#C62F2F]" />
                </div>
                <div>
                  <label className="flex justify-between text-[11px] font-bold text-[#B7740A] mb-1">
                    <span>Soon</span><span className="bg-[#FBEFD6] px-1.5 rounded">{soonPct}%</span>
                  </label>
                  <input type="range" min="0" max="100" value={soonPct} onChange={e => handlePctChange('soon', parseInt(e.target.value))} className="w-full accent-[#B7740A]" />
                </div>
                <div>
                  <label className="flex justify-between text-[11px] font-bold text-[#23764E] mb-1.5">
                    <span>Routine</span><span className="bg-[#E0F2E8] px-1.5 rounded">{100 - immPct - soonPct}%</span>
                  </label>
                  <div className="w-full bg-[#F4F9FB] border border-[#D6E4EA] h-3 rounded-full overflow-hidden flex">
                    <div className="bg-[#C62F2F] h-full transition-all" style={{width: `${immPct}%`}}></div>
                    <div className="bg-[#B7740A] h-full transition-all" style={{width: `${soonPct}%`}}></div>
                    <div className="bg-[#23764E] h-full transition-all" style={{width: `${100 - immPct - soonPct}%`}}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-[#D6E4EA]">
              <label className="flex justify-between text-xs font-bold text-[#4A5B6B] mb-1.5">
                <span>Simulation Runs</span><span className="text-[#12324A] bg-[#F4F9FB] px-1.5 rounded">{runs}</span>
              </label>
              <input type="range" min="10" max="500" value={runs} onChange={e => setRuns(parseInt(e.target.value))} className="w-full accent-[#0E7C86]" />
            </div>
            
            <button 
              onClick={runSimulation} 
              disabled={isSimulating}
              className="btn-primary w-full py-3.5 mt-2 shadow-sm"
            >
              {isSimulating ? 'Simulating...' : <><Play size={16} /> Run {runs} Scenarios</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Results ── */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-[#FBEFD6] border border-[#B7740A]/30 text-[#B7740A] px-5 py-3 rounded-xl text-xs font-bold shadow-sm flex items-start gap-3">
          <Binary className="shrink-0 mt-0.5" size={16} />
          <div>Illustrative simulation based on Monte Carlo random sampling. Not actual clinical evidence.</div>
        </div>

        {results ? (
          <div className="card p-6 flex-1 flex flex-col">
            <h2 className="text-lg font-black text-[#12324A] mb-1">Wait Times (Minutes)</h2>
            <p className="text-[#4A5B6B] text-xs font-medium mb-6">
              Aggregated over {runs} runs. Max Routine wait hit <span className="font-bold text-[#12324A] bg-[#F4F9FB] px-1.5 rounded">{Math.round(results.maxRoutineWait)} min</span>.
            </p>
            
            <div className="flex-1 min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D6E4EA" />
                  <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 700, fill: '#4A5B6B'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 11, fontWeight: 700, fill: '#4A5B6B'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#F4F9FB'}} 
                    contentStyle={{borderRadius: '12px', border: '1px solid #D6E4EA', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontWeight: 'bold', fontSize: '12px', color: '#12324A'}} 
                  />
                  <Legend wrapperStyle={{paddingTop: '20px', fontWeight: 'bold', fontSize: '12px', color: '#12324A'}} />
                  <Bar dataKey="FCFS" fill="#9CA3AF" radius={[6, 6, 0, 0]} name="First Come First Serve" />
                  <Bar dataKey="OPDFlow" fill="#0E7C86" radius={[6, 6, 0, 0]} name="OPD Flow (Triage)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card flex-1 flex flex-col items-center justify-center p-10 text-center border-dashed border-2 border-[#D6E4EA] bg-[#F4F9FB]/50">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#0E7C86] mb-4">
              <Play size={28} />
            </div>
            <h3 className="text-[#12324A] font-black text-lg mb-2">Ready to Simulate</h3>
            <p className="text-sm font-medium text-[#4A5B6B] max-w-xs">
              Adjust parameters on the left and hit run to compare standard FCFS against our triage priority engine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
