import React from 'react';
import ParametresGlobaux from './ParametresGlobaux';
import FiltresContextuels from './FiltresContextuels';

export default function BarreConfiguration({ viewLevel }) {
    const showFilters = ['intervenant', 'centre'].includes(viewLevel);

    return (
        <div className="flex flex-col w-full">
            {/* 1. Global Parameters (Always visible) */}
            <ParametresGlobaux />

            {/* 2. Contextual Filters (One Intervenant/Centre views) */}
            {showFilters && (
                <FiltresContextuels />
            )}
        </div>
    );
}
