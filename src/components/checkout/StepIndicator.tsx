"use client";

import { motion } from "framer-motion";
import { Check, User, Truck, CreditCard, Gift } from "lucide-react";
import { useTranslations } from "next-intl";

interface StepIndicatorProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isStep1Valid: boolean;
  isStep2Valid: boolean;
}

export function StepIndicator({ 
  currentStep, 
  setCurrentStep, 
  isStep1Valid, 
  isStep2Valid 
}: StepIndicatorProps) {
  const t = useTranslations("Checkout");

  const steps = [
    { id: 1, name: t('step_info'), icon: User },
    { id: 2, name: t('step_shipping'), icon: Truck },
    { id: 3, name: t('step_options', { defaultMessage: 'Opțiuni' }), icon: Gift },
    { id: 4, name: t('step_payment'), icon: CreditCard },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 md:py-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-[22px] left-[15%] right-[15%] h-[2px] bg-zinc-200 -z-0">
          <motion.div 
            className="h-full bg-[#e32f8c]"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
          />
        </div>

        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          
          // Navigation logic: can go back anytime, can go forward only if previous is valid
          let isClickable = false;
          if (step.id === 1) isClickable = true;
          if (step.id === 2) isClickable = isStep1Valid;
          if (step.id === 3) isClickable = isStep1Valid && isStep2Valid;
          if (step.id === 4) isClickable = isStep1Valid && isStep2Valid;
          
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
              <motion.button
                type="button"
                onClick={() => isClickable && setCurrentStep(step.id)}
                initial={false}
                animate={{
                  backgroundColor: isCompleted || isActive ? "#e32f8c" : "#ffffff",
                  borderColor: isCompleted || isActive ? "#e32f8c" : "#e4e4e7",
                  color: isCompleted || isActive ? "#000000" : "#a1a1aa",
                  scale: isClickable ? 1 : 0.95,
                  opacity: isClickable ? 1 : 0.5,
                }}
                whileHover={isClickable ? { scale: 1.1 } : {}}
                whileTap={isClickable ? { scale: 0.9 } : {}}
                className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center shadow-sm transition-all focus:outline-none ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                title={!isClickable ? t('step_info_valid') : ""}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </motion.button>
              <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isActive || isCompleted ? "text-black" : "text-zinc-400"}`}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
