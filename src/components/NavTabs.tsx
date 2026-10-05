import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Trophy, GitMerge, Shield, Award } from 'lucide-react';
import { TabType, Category } from '../types';

interface NavTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  setSelectedTeam: (team: string | null) => void;
  activeCategory: Category;
  setActiveCategory: (cat: Category) => void;
  format?: 'group-playoff' | 'league' | 'knockout';
}

const TAB_CONFIG = [
  { id: 'schedule' as TabType, icon: CalendarDays, label: 'Liga' },
  { id: 'standings' as TabType, icon: Trophy, label: 'Tabla' },
  { id: 'playoffs' as TabType, icon: GitMerge, label: 'Finales' },
  { id: 'ranking' as TabType, icon: Award, label: 'Ranking' },
  { id: 'team' as TabType, icon: Shield, label: 'Equipos' },
];

export const NavTabs: React.FC<NavTabsProps> = ({
  activeTab,
  setActiveTab,
  setSelectedTeam,
  activeCategory,
  setActiveCategory,
  format,
}) => {
  const navRef = useRef<HTMLDivElement>(null);

  const tabsToRender = TAB_CONFIG.filter(tab => {
    if (format === 'league' && tab.id === 'playoffs') return false;
    if (format === 'knockout' && tab.id === 'standings') return false;
    return true;
  });
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const el = tabRefs.current.get(activeTab);
    const nav = navRef.current;
    if (el && nav) {
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicator({
        left: elRect.left - navRect.left + nav.scrollLeft,
        width: elRect.width,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <>
      {/* Category Toggle */}
      <div className="bg-natural-bg p-3 md:p-4 flex justify-center gap-2 md:gap-4 z-10 sticky top-0" id="category-tabs">
        {(['masculino', 'femenino'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`relative px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-base transition-all flex-1 max-w-[200px] shadow-sm overflow-hidden ${
              activeCategory === cat
                ? 'bg-natural-primary text-white'
                : 'bg-natural-sidebar text-natural-text hover:bg-natural-border'
            }`}
          >
            {activeCategory === cat && (
              <motion.div
                layoutId="category-pill"
                className="absolute inset-0 bg-natural-primary rounded-xl md:rounded-2xl"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {cat === 'masculino' ? 'Masculino' : 'Femenino'}
            </span>
          </button>
        ))}
      </div>

      {/* Navigation Tabs with sliding indicator */}
      <nav
        ref={navRef}
        className="relative flex bg-white/80 backdrop-blur-md shadow-sm overflow-x-auto hide-scrollbar border-b border-natural-border"
        id="nav-tabs"
      >
        {/* Sliding indicator */}
        <motion.div
          className="absolute bottom-0 h-[3px] bg-natural-primary rounded-full z-10"
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />

        {tabsToRender.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              ref={(el) => { if (el) tabRefs.current.set(id, el); }}
              onClick={() => {
                setActiveTab(id);
                if (id === 'team') setSelectedTeam(null);
              }}
              className={`relative px-2 md:px-4 py-3 md:py-4 font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 whitespace-nowrap transition-colors flex-1 ${
                isActive
                  ? 'text-natural-primary bg-natural-sidebar/50'
                  : 'text-natural-text/40 hover:text-natural-text/60 hover:bg-natural-bg'
              }`}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
              </motion.div>
              <span className="text-[10px] md:text-sm uppercase tracking-wider">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
