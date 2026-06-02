import React, { useState, useMemo } from 'react';

interface Course {
  id: string;
  name: string;
  grade: string;
  credits: number;
  isWeighted: boolean;
}

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0
};

const GPACalculator: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', name: '', grade: 'A', credits: 3, isWeighted: false },
    { id: '2', name: '', grade: 'B+', credits: 3, isWeighted: false },
  ]);

  const addCourse = () => {
    setCourses([...courses, { id: Math.random().toString(36).substr(2, 9), name: '', grade: 'A', credits: 3, isWeighted: false }]);
  };

  const removeCourse = (id: string) => {
    if (courses.length > 1) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setCourses(courses.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const gpa = useMemo(() => {
    let totalPoints = 0;
    let totalCredits = 0;

    courses.forEach(c => {
      const basePoints = GRADE_POINTS[c.grade] || 0;
      const weightedPoints = c.isWeighted ? basePoints + 1.0 : basePoints;
      totalPoints += weightedPoints * c.credits;
      totalCredits += c.credits;
    });

    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  }, [courses]);

  const getGPAColor = (val: number) => {
    if (val >= 3.5) return 'text-emerald-400';
    if (val >= 3.0) return 'text-blue-400';
    if (val >= 2.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/30">
          <div>
            <h2 className="text-2xl font-bold text-black dark:text-white">Cumulative GPA Calculator</h2>
            <p className="text-gray-600 dark:text-slate-400 text-sm">Calculate your semester or overall GPA with weighted options</p>
          </div>
          <button 
            onClick={addCourse}
            className="bg-blue-600 hover:bg-blue-500 text-black dark:text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Course
          </button>
        </div>

        <div className="p-4 md:p-6">
          <div className="space-y-4">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">
              <div className="col-span-4">Course Name</div>
              <div className="col-span-2 text-center">Grade</div>
              <div className="col-span-2 text-center">Credits</div>
              <div className="col-span-3 text-center">Weighted (AP/H)</div>
              <div className="col-span-1"></div>
            </div>

            {/* Course Rows */}
            {courses.map((course) => (
              <div key={course.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-100 dark:bg-slate-800/30 p-4 rounded-2xl border border-gray-300 dark:border-slate-700/50 group transition-all hover:border-gray-400 dark:border-slate-600">
                <div className="col-span-4">
                  <input 
                    type="text" 
                    placeholder="e.g. Calculus I"
                    value={course.name}
                    onChange={(e) => updateCourse(course.id, { name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2 text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <select 
                    value={course.grade}
                    onChange={(e) => updateCourse(course.id, { grade: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2 text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {Object.keys(GRADE_POINTS).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input 
                    type="number" 
                    value={course.credits}
                    onChange={(e) => updateCourse(course.id, { credits: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2 text-black dark:text-white text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-3 flex justify-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={course.isWeighted}
                      onChange={(e) => updateCourse(course.id, { isWeighted: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button 
                    onClick={() => removeCourse(course.id)}
                    className="text-gray-500 dark:text-slate-500 hover:text-red-400 transition-colors p-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-gray-600 dark:text-slate-400 font-medium">Your Cumulative GPA</p>
            <h1 className={`text-7xl font-black ${getGPAColor(gpa)}`}>{gpa.toFixed(2)}</h1>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
             <div className="bg-gray-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-300 dark:border-slate-700 text-center">
                <p className="text-xs text-gray-500 dark:text-slate-500 uppercase font-bold">Total Credits</p>
                <p className="text-2xl font-bold text-black dark:text-white">{courses.reduce((acc, c) => acc + c.credits, 0)}</p>
             </div>
             <div className="bg-gray-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-300 dark:border-slate-700 text-center">
                <p className="text-xs text-gray-500 dark:text-slate-500 uppercase font-bold">Courses</p>
                <p className="text-2xl font-bold text-black dark:text-white">{courses.length}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPACalculator;
