import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title = "Confirmation",
    message,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    variant = "default" // default, destructive
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <AlertTriangle className={`w-5 h-5 ${variant === 'destructive' ? 'text-red-500' : 'text-amber-500'}`} />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {message}
                    </p>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                        className={`text-xs ${variant === 'default' ? 'bg-[#005EA8] hover:bg-[#004e8a]' : ''}`}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
