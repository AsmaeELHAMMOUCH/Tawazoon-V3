import React, { useMemo, memo } from "react";
import { Download, Layers } from "lucide-react";
import { fmt } from "../../utils/formatters";
import * as XLSX from "xlsx";

function DirectionConsolideTable({
    rows = [],
    totals = {},
    loading = false,
    onViewDistribution
}) {
    // ... body ...
    const exportExcel = () => {
        // ...
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm mt-2 flex flex-col overflow-hidden">
            {/* ... content ... */}
            <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left border-collapse">
                    {/* ... */}
                </table>
            </div>
        </div>
    );
}

export default memo(DirectionConsolideTable);
