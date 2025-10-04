import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function InvalidModal({ isOpen, onClose, children }) {
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEsc);

        return () => {
            window.removeEventListener("keydown", handleEsc);
        };
    }, [onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="flex items-center justify-center bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="text-3xl text-red-600 font-bold">
                    Your Certificate is invalid!
                </span>
                
            </div>
        </div>
    );
}
