import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { POPULAR_DESTINATIONS } from '../data/popularDestinations';

export default function PopularDestinationsModal({ isOpen, onClose, onSelectDestination }) {
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDestinations = useMemo(() => {
    return POPULAR_DESTINATIONS.filter((item) => {
      const matchesType = selectedType === 'All' || item.type === selectedType;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sub.toLowerCase().includes(query) ||
        item.state.toLowerCase().includes(query) ||
        (item.type && item.type.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query);

      return matchesType && matchesQuery;
    });
  }, [selectedType, searchQuery]);

  const typeCounts = useMemo(() => {
    const counts = { All: POPULAR_DESTINATIONS.length, Airport: 0, 'Railway Station': 0, 'Tourist Spot': 0, Destination: 0 };
    POPULAR_DESTINATIONS.forEach((d) => {
      if (counts[d.type] !== undefined) {
        counts[d.type]++;
      }
    });
    return counts;
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99990,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          style={{
            width: '100%',
            maxWidth: '430px',
            height: '92vh',
            maxHeight: '92vh',
            background: 'var(--sheet, #FFFFFF)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Grab handle indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '4px' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '999px', background: 'rgba(150, 150, 150, 0.35)' }} />
          </div>

          {/* Header */}
          <div
            style={{
              padding: '8px 16px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--line, rgba(0,0,0,0.06))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to Home"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid var(--line, rgba(0, 0, 0, 0.08))',
                  background: 'var(--field, #F4F4F5)',
                  color: 'var(--ink, #18181B)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink, #18181B)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Popular Destinations
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--field, rgba(0,0,0,0.05))',
                color: 'var(--muted, #71717A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Search bar */}
          <div style={{ padding: '10px 16px 8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--field, #F4F4F5)',
                borderRadius: '14px',
                padding: '8px 12px',
                gap: '8px',
                border: '1px solid var(--line, rgba(0, 0, 0, 0.06))'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted, #71717A)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search airport, station, tourist spot, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--ink, #18181B)',
                  width: '100%'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted, #71717A)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 16px 10px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {['All', 'Airport', 'Railway Station', 'Tourist Spot', 'Destination'].map((typeName) => {
              const active = selectedType === typeName;
              return (
                <button
                  key={typeName}
                  type="button"
                  onClick={() => setSelectedType(typeName)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    border: active ? 'none' : '1px solid var(--line, rgba(0, 0, 0, 0.1))',
                    background: active ? 'var(--solid, #0F172A)' : 'var(--field, #F4F4F5)',
                    color: active ? 'var(--on-solid, #FFFFFF)' : 'var(--ink, #3F3F46)',
                    fontWeight: active ? 700 : 550,
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <span>{typeName === 'All' ? 'All' : typeName}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      opacity: active ? 0.9 : 0.6,
                      background: active ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.15)',
                      padding: '1px 5px',
                      borderRadius: '8px'
                    }}
                  >
                    {typeCounts[typeName] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Destinations Grid View */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '4px 14px 28px',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {filteredDestinations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted, #71717A)' }}>
                <p style={{ fontWeight: 600, fontSize: '15px', margin: '0 0 6px' }}>No destinations found</p>
                <span style={{ fontSize: '12.5px' }}>Try searching for a different city or filter</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '12px'
                }}
              >
                {filteredDestinations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectDestination(item.bookingCat, item)}
                    style={{
                      background: 'var(--card, #FFFFFF)',
                      borderRadius: '16px',
                      border: '1px solid var(--line, rgba(0, 0, 0, 0.08))',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.04)',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Destination Image with Badge */}
                    <div style={{ position: 'relative', width: '100%', height: '115px' }}>
                      <img
                        src={item.img}
                        alt={item.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                      {/* Type Pill */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(4px)',
                          color: '#FFFFFF',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          letterSpacing: '0.2px'
                        }}
                      >
                        {item.type || item.state}
                      </span>
                      {/* Rating Badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'var(--card, rgba(255, 255, 255, 0.92))',
                          backdropFilter: 'blur(4px)',
                          color: 'var(--ink, #0F172A)',
                          fontSize: '10px',
                          fontWeight: 750,
                          padding: '2px 6px',
                          borderRadius: '8px',
                          border: '1px solid var(--line, rgba(0,0,0,0.08))',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        <span style={{ color: '#EAB308' }}>★</span> {item.rating}
                      </span>

                      {/* Tag pill bottom */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '8px',
                          right: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}
                        >
                          {item.estDrive}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '9px 10px 10px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <b
                          style={{
                            fontSize: '13px',
                            fontWeight: 650,
                            color: 'var(--ink, #18181B)',
                            lineHeight: 1.25,
                            letterSpacing: '-0.015em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.name}
                        </b>
                      </div>

                      <div
                        style={{
                          marginTop: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '6px',
                          borderTop: '1px dashed var(--line, rgba(0, 0, 0, 0.08))'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: '#059669',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '2px 5px',
                            borderRadius: '4px'
                          }}
                        >
                          Driver Ready
                        </span>

                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 750,
                            color: 'var(--ink, #0F172A)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          Book →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
