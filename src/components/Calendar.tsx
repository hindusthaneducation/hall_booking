import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  status: 'available' | 'pending' | 'booked';
  departmentShortName?: string;
  isPast?: boolean;
}

interface CalendarProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  days: CalendarDay[];
  onDateClick: (date: Date) => void;
}

export function Calendar({ currentDate, onMonthChange, days, onDateClick }: CalendarProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const getStatusStyles = (day: CalendarDay) => {
    if (day.isPast) {
      if (day.status === 'available') {
        return 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100';
      }
      // If booked/pending in past, keep color and allow click for details
      return 'opacity-75 cursor-pointer ' + (day.status === 'booked' ? 'bg-green-100 border-green-300 text-green-900' : 'bg-yellow-100 border-yellow-300 text-yellow-900');
    }

    switch (day.status) {
      case 'booked':
        return 'bg-green-100 border-green-300 text-green-900 cursor-pointer hover:bg-green-200';
      case 'pending':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900 cursor-pointer hover:bg-yellow-200';
      default:
        return 'bg-white border-gray-200 text-gray-900 hover:bg-blue-50 hover:border-blue-300 cursor-pointer';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays?.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days?.map((day, index) => (
          <button
            key={index}
            onClick={() => day.isCurrentMonth && onDateClick(day.date)}
            disabled={!day.isCurrentMonth}
            className={`
              aspect-square p-2 rounded-lg border text-sm transition-colors
              ${!day.isCurrentMonth ? 'opacity-30' : ''}
              ${getStatusStyles(day)}
            `}
          >
            <div className="font-medium">{day.date.getDate()}</div>
            {day.departmentShortName && (
              <div className="text-xs mt-1 font-semibold truncate">
                {day.departmentShortName}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
          <span className="text-gray-600">Booked</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
          <span className="text-gray-600">Pending</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded mr-2"></div>
          <span className="text-gray-600">Available</span>
        </div>
      </div>
    </div>
  );
}
