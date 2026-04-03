import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import ForecastingModule from "@/components/centres_uniq/ForecastingModule";

export default function ForecastingDialog({
    open,
    onOpenChange,
    initialFte = 0,
    initialLoad = 0,
    gridValues = null,
    initialPosteId = "all",
    postes = [],
    tasks = [],
    simulationResults = null,
    centreDetails = null,
    wizardData = null,
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] lg:max-w-7xl max-h-[95vh] h-fit p-0 overflow-hidden border-none shadow-2xl rounded-2xl [&>button]:z-50 [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button:hover]:opacity-100">
                <VisuallyHidden.Root>
                    <DialogTitle>Prévisions sur 5 ans</DialogTitle>
                    <DialogDescription>
                        Calcul des projections d'effectifs basées sur les taux de croissance annuels.
                    </DialogDescription>
                </VisuallyHidden.Root>

                <ForecastingModule
                    initialFte={initialFte}
                    initialLoad={initialLoad}
                    gridValues={gridValues || wizardData?.gridValues}
                    parameters={wizardData || {}}
                    centreId={wizardData?.centre || wizardData?.centre_id}
                    initialPosteId={initialPosteId}
                    postes={postes}
                    tasks={tasks}
                    simulationResults={simulationResults}
                    centreDetails={centreDetails}
                    className="border-none shadow-none"
                />
            </DialogContent>
        </Dialog>
    );
}

