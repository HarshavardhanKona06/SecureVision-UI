"use client";
import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { IconUpload, IconCommand, IconPhoto, IconTrashX, IconDownload } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";

interface ProcessedShares {
    share1: string | null;
    share2: string | null;
    recovery_data: string | null;
    metadata: {
        shape: number[];
        dtype: string;
    } | null;
}

const ACCEPTED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/tiff",
    "image/heic"
];

export default function SecureImagePage() {
    const [image, setImage] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [preview, setPreview] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [processedShares, setProcessedShares] = useState<ProcessedShares>({
        share1: null,
        share2: null,
        recovery_data: null,
        metadata: null,
    });
    const [error, setError] = useState<string | null>(null);

    const handleFile = (file: File | null) => {
        if (file && ACCEPTED_TYPES.includes(file.type)) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setProcessedShares({ share1: null, share2: null, recovery_data: null, metadata: null }); // Reset shares when new image is uploaded
            setError(null);
        }
    };

    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        handleFile(file);
    };

    const processImage = async () => {
        if (!image) return;

        setIsProcessing(true);
        setError(null);

        const formData = new FormData();
        formData.append("image", image);

        try {
            const response = await fetch("http://127.0.0.1:8000/api/v1/encrypt", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to process image");
            }

            const result = await response.json();
            if (result.success) {
                setProcessedShares({
                    share1: result.data.share1,
                    share2: result.data.share2,
                    recovery_data: result.data.recovery_data,
                    metadata: result.data.metadata,
                });
            } else {
                throw new Error("Processing failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadShares = async () => {
        // Type guard to ensure all required data is present
        if (!processedShares.share1 ||
            !processedShares.share2 ||
            !processedShares.recovery_data ||
            !processedShares.metadata) {
            console.error("Missing required data for download");
            return;
        }

        const zip = new JSZip();

        // Remove the "data:image/png;base64," prefix if present
        const share1Data = processedShares.share1.includes("base64,")
            ? processedShares.share1.split("base64,")[1]
            : processedShares.share1;

        const share2Data = processedShares.share2.includes("base64,")
            ? processedShares.share2.split("base64,")[1]
            : processedShares.share2;

        // Now we're sure these aren't null
        zip.file("share1.png", share1Data, { base64: true });
        zip.file("share2.png", share2Data, { base64: true });
        zip.file("recovery_data.bin", processedShares.recovery_data, { base64: true });
        zip.file("metadata.json", JSON.stringify(processedShares.metadata));

        try {
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = "encrypted_shares.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Error generating zip file:", error);
            // You might want to show this error to the user
            setError("Failed to download encrypted shares");
        }
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (items) {
                for (const item of items) {
                    if (item.type.includes("image")) {
                        const file = item.getAsFile();
                        handleFile(file);
                        break;
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);

    const isProcessed = processedShares.share1 !== null && processedShares.share2 !== null;

    return (
        <div
            className="min-h-[calc(100vh-4rem)] bg-cyan-950 px-3 md:px-0"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {/* Main content */}
            <div className="max-w-4xl mx-auto pt-10 min-[400px]:pt-20 flex flex-col items-center h-[calc(100vh-5rem)]">
                {/* Animated Heading */}
                <motion.h1
                    initial={false}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.6 }}
                    className="text-cyan-50 text-2xl sm:text-3xl md:text-4xl font-raleway mb-8"
                >
                    {isProcessed ? "Image is Secured" : "Start Securing the Image"}
                </motion.h1>

                {/* Content Container - Flex column on mobile, row on larger screens */}
                <div className="w-full flex flex-col lg:flex-row justify-center gap-6">
                    {/* Original Image Container */}
                    <motion.div
                        initial={{ x: 0, y: 0 }}
                        animate={{
                            x: isProcessed ? window.innerWidth >= 1024 ? "-10%" : 0 : 0,
                            y: isProcessed ? window.innerWidth >= 1024 ? 0 : 0 : 0
                        }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="w-full lg:w-1/2"
                    >
                        <label
                            className={`
                                w-full aspect-video flex flex-col items-center justify-center
                                border-2 border-dashed rounded-2xl
                                ${preview ? "border-cyan-600" : "border-cyan-600/50"}
                                ${preview ? "bg-cyan-900/20" : "bg-cyan-900/10"}
                                transition-colors duration-200 cursor-pointer
                                hover:border-cyan-500 hover:bg-cyan-900/30
                                relative
                            `}
                        >
                            <input
                                type="file"
                                className="hidden"
                                accept={ACCEPTED_TYPES.join(",")}
                                onChange={handleChange}
                            />

                            {preview ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={preview}
                                        alt="Preview"
                                        fill
                                        className="max-h-full max-w-full object-contain p-4 rounded-xl"
                                        sizes="(max-width: 768px) 100vw, 768px"
                                    />
                                    {!isProcessed && (
                                        <div className="absolute bottom-3 right-3">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setImage(null);
                                                    setPreview("");
                                                    setProcessedShares({ share1: null, share2: null, recovery_data: null, metadata: null });
                                                }}
                                                className="p-2 rounded-full bg-red-500/50 hover:bg-red-500/80 transition-colors duration-200"
                                                title="Delete"
                                            >
                                                <IconTrashX className="w-6 h-6 text-red-500 hover:text-red-800" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-4 p-4">
                                    <IconUpload className="w-12 h-12 text-cyan-500" />
                                    <div className="text-center space-y-0.5">
                                        <div className="relative cursor-pointer font-lato rounded-md font-semibold text-cyan-400/70 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-400/70 focus-within:ring-offset-2 hover:text-cyan-500">
                                            Choose a file <span className="text-cyan-50">or drag & drop</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-1 text-cyan-400 text-md font-lato">
                                            <IconCommand className="w-4 h-4" />
                                            <span>+</span>
                                            <span>V</span>
                                            <span className="text-cyan-400/70">to paste</span>
                                        </div>
                                        <p className="text-sm text-white/70 mt-2 font-lato">
                                            Supported Images (PNG, JPEG, JPG, TIFF, HEIC)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {dragActive && (
                                <div className="absolute inset-0 bg-cyan-900/90 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <IconPhoto className="absolute top-1/3 left-8 w-8 h-8 text-cyan-400/50 rotate-[-15deg]" />
                                    <IconPhoto className="absolute bottom-1/3 right-8 w-8 h-8 text-cyan-400/50 rotate-[15deg]" />
                                    <div className="text-cyan-50 text-xl font-raleway">
                                        Drag your Image here to Secure
                                    </div>
                                </div>
                            )}
                        </label>
                    </motion.div>

                    {/* Results Container */}
                    <AnimatePresence>
                        {isProcessed && (
                            <motion.div
                                initial={{
                                    opacity: 0,
                                    x: window.innerWidth >= 1024 ? "10%" : 0,
                                    y: window.innerWidth >= 1024 ? 0 : 20
                                }}
                                animate={{
                                    opacity: 1,
                                    x: 0,
                                    y: 0
                                }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="w-full lg:w-1/2"
                            >
                                <div className="border-2 border-dashed border-cyan-600 rounded-2xl bg-cyan-900/20 aspect-video p-4 relative">
                                    <div className="flex flex-row gap-4 h-full">
                                        {/* Share 1 */}
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.4, delay: 0.4 }}
                                            className="relative w-1/2 h-full rounded-lg overflow-hidden"
                                        >
                                            <img
                                                src={`data:image/png;base64,${processedShares.share1}`}
                                                alt="Share 1"
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        </motion.div>

                                        {/* Share 2 */}
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.4, delay: 0.6 }}
                                            className="relative w-1/2 h-full rounded-lg overflow-hidden"
                                        >
                                            <img
                                                src={`data:image/png;base64,${processedShares.share2}`}
                                                alt="Share 2"
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        </motion.div>
                                    </div>

                                    {/* Download Button */}
                                    <div className="absolute bottom-3 right-3">
                                        <button
                                            onClick={downloadShares}
                                            className="p-2 rounded-full bg-emerald-500/50 hover:bg-emerald-500/80 transition-colors duration-200"
                                            title="Download Shares"
                                        >
                                            <IconDownload className="w-6 h-6 text-emerald-500 hover:text-emerald-800" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Action Button */}
                {!isProcessed && (
                    <button
                        onClick={processImage}
                        disabled={!image || isProcessing}
                        className={`
                            mt-6 px-6 py-3 rounded-2xl font-lato font-medium text-base md:text-lg
                            ${image
                        ? isProcessing
                            ? "bg-cyan-800 text-cyan-400 cursor-not-allowed"
                            : "bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"
                        : "bg-cyan-800 text-cyan-400 cursor-not-allowed"}
                            transition-colors duration-200
                        `}
                    >
                        {isProcessing ? "Securing the Image..." : "Secure Image"}
                    </button>
                )}

                {error && (
                    <div className="mt-4 text-red-400 text-sm font-lato">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};
