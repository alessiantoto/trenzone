import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CheckoutState {
  email: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  country: string;
  phoneCountry: string;
  shippingType: 'hd' | 'pudo';
  selectedServiceId: string;
  selectedBranches: Record<string, { id: string; name: string } | null>;
  priorityProcessing: boolean;
  giftPackaging: boolean;
  giftMessage: string;
  
  // Actions
  setEmail: (val: string) => void;
  setFirstName: (val: string) => void;
  setLastName: (val: string) => void;
  setLine1: (val: string) => void;
  setLine2: (val: string) => void;
  setCity: (val: string) => void;
  setState: (val: string) => void;
  setPostalCode: (val: string) => void;
  setPhone: (val: string) => void;
  setCountry: (val: string) => void;
  setPhoneCountry: (val: string) => void;
  setShippingType: (val: 'hd' | 'pudo') => void;
  setSelectedServiceId: (val: string) => void;
  setSelectedBranch: (serviceId: string, branch: { id: string; name: string } | null) => void;
  setPriorityProcessing: (val: boolean) => void;
  setGiftPackaging: (val: boolean) => void;
  setGiftMessage: (val: string) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      email: '',
      firstName: '',
      lastName: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      phone: '',
      country: 'RO',
      phoneCountry: 'RO',
      shippingType: 'hd',
      selectedServiceId: '',
      selectedBranches: {},
      priorityProcessing: false,
      giftPackaging: false,
      giftMessage: '',

      setEmail: (val) => set({ email: val }),
      setFirstName: (val) => set({ firstName: val }),
      setLastName: (val) => set({ lastName: val }),
      setLine1: (val) => set({ line1: val }),
      setLine2: (val) => set({ line2: val }),
      setCity: (val) => set({ city: val }),
      setState: (val) => set({ state: val }),
      setPostalCode: (val) => set((state) => ({ 
        postalCode: state.country === 'RO' ? val.replace(/[^0-9]/g, '').slice(0, 6) : val 
      })),
      setPhone: (val) => set({ phone: val }),
      setCountry: (val) => set((state) => ({ 
        country: val,
        postalCode: val === 'RO' ? state.postalCode.replace(/[^0-9]/g, '').slice(0, 6) : state.postalCode
      })),
      setPhoneCountry: (val) => set({ phoneCountry: val }),
      setShippingType: (val) => set({ shippingType: val }),
      setSelectedServiceId: (val) => set({ selectedServiceId: val }),
      setSelectedBranch: (serviceId, branch) => set((state) => ({
        selectedBranches: {
          ...state.selectedBranches,
          [serviceId]: branch
        }
      })),
      setPriorityProcessing: (val) => set({ priorityProcessing: val }),
      setGiftPackaging: (val) => set({ giftPackaging: val }),
      setGiftMessage: (val) => set({ giftMessage: val }),
      resetCheckout: () => set({
        email: '',
        firstName: '',
        lastName: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        phone: '',
        country: 'RO',
        phoneCountry: 'RO',
        shippingType: 'hd',
        selectedServiceId: '',
        selectedBranches: {},
        priorityProcessing: false,
        giftPackaging: false,
        giftMessage: '',
      }),
    }),
    {
      name: 'campion-checkout-state',
    }
  )
);
