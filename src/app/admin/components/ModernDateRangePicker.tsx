import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, isAfter, isBefore, startOfWeek, endOfWeek } from 'date-fns';
import { ro } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface ModernDateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

export const ModernDateRangePicker: React.FC<ModernDateRangePickerProps> = ({ startDate, endDate, onRangeChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(startDate || new Date()));
  const [selectingStart, setSelectingStart] = useState<Date | null>(new Date(startDate));
  const [selectingEnd, setSelectingEnd] = useState<Date | null>(new Date(endDate));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDateOfWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDateOfWeek = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDateOfWeek, end: endDateOfWeek });

  const handleDayClick = (day: Date) => {
    if (selectingStart && !selectingEnd) {
      if (isBefore(day, selectingStart)) {
        setSelectingStart(day);
      } else {
        setSelectingEnd(day);
        onRangeChange(format(selectingStart, 'yyyy-MM-dd'), format(day, 'yyyy-MM-dd'));
      }
    } else {
      setSelectingStart(day);
      setSelectingEnd(null);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 select-none">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="font-black text-slate-900 text-sm capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ro })}
        </div>
        <button 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* DAYS GRID */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'].map(d => (
          <div key={d} className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => {
          const isSelectedStart = selectingStart && isSameDay(day, selectingStart);
          const isSelectedEnd = selectingEnd && isSameDay(day, selectingEnd);
          
          let isHoverInRange = false;
          let isInRange = false;

          if (selectingStart && selectingEnd) {
             isInRange = isWithinInterval(day, { start: selectingStart, end: selectingEnd });
          } else if (selectingStart && !selectingEnd && hoverDate) {
             isHoverInRange = (isAfter(day, selectingStart) && isBefore(day, hoverDate)) || (isBefore(day, selectingStart) && isAfter(day, hoverDate));
          }

          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div 
              key={i}
              onMouseEnter={() => setHoverDate(day)}
              onClick={() => handleDayClick(day)}
              className={`
                relative flex items-center justify-center h-8 cursor-pointer text-xs font-bold transition-all
                ${!isCurrentMonth ? 'text-slate-300 opacity-50' : 'text-slate-700'}
                ${isSelectedStart || isSelectedEnd ? 'z-10' : ''}
                ${(isInRange || isHoverInRange) && !isSelectedStart && !isSelectedEnd ? 'bg-[#e32f8c]/10' : ''}
                ${isInRange && isSelectedStart ? 'rounded-l-lg bg-[#e32f8c]/10' : ''}
                ${isInRange && isSelectedEnd ? 'rounded-r-lg bg-[#e32f8c]/10' : ''}
              `}
            >
              {(isSelectedStart || isSelectedEnd) && (
                <div className="absolute inset-0 bg-[#e32f8c] rounded-lg shadow-sm shadow-[#e32f8c]/20" />
              )}
              <span className={`relative z-20 ${isSelectedStart || isSelectedEnd ? 'text-black' : ''}`}>
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* QUICK PREVIEW */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
         <div className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
           {selectingStart ? format(selectingStart, 'dd.MM.yyyy') : '--'}
         </div>
         <ChevronRight size={14} className="text-slate-300" />
         <div className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
           {selectingEnd ? format(selectingEnd, 'dd.MM.yyyy') : '--'}
         </div>
      </div>
    </div>
  );
};
