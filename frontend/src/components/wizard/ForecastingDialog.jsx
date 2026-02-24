import React from "react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import ForecastingModule from "@/components/centres_uniq/ForecastingModule";

export default function ForecastingDialog({
    open,
    onOpenChange,
    initialFte = 0,
    initialLoad = 0,
    gridValues = null,
    postes = [],
    tasks = [],
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[95vh] h-fit p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <ForecastingModule
                    initialFte={initialFte}
                    initialLoad={initialLoad}
                    gridValues={gridValues}
                    postes={postes}
                    tasks={tasks}
                    className="border-none shadow-none"
                />
            </DialogContent>
        </Dialog>
    );
}

