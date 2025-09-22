import { useState, useCallback } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastCount = 0;

export function toast(props: Omit<Toast, "id">) {
  // Simple console log for now - you can integrate with a real toast library later
  if (props.variant === "destructive") {
    console.error(`[Toast Error] ${props.title}: ${props.description}`);
  } else {
    console.log(`[Toast] ${props.title}: ${props.description}`);
  }

  // For now, also show an alert for user feedback
  if (typeof window !== "undefined") {
    const message = `${props.title}${props.description ? ': ' + props.description : ''}`;
    if (props.variant === "destructive") {
      window.alert(`Error: ${message}`);
    } else {
      // Don't show success alerts as they're annoying
      console.log(message);
    }
  }
}