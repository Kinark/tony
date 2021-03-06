import create from 'zustand';
import { configurePersist } from 'zustand-persist';

const { persist, purge } = configurePersist({
  storage: localStorage, // use `AsyncStorage` in react native
});

export type ThemeTypes = 'dark' | 'light' | 'auto';

export type NodeColors = typeof initialLight;

interface NodeColorsThemes {
  light: NodeColors;
  dark: NodeColors;
}

interface Prefereces {
  showNodeIds: boolean;
  showConditionsConnections: boolean;
  duplicateEdgesWhenAltDragging: boolean;
}

interface UserStore {
  email: string;
  uid: string;
  theme: ThemeTypes;
  nodeColors: NodeColorsThemes;
  preferences: Prefereces;
  setEmail: (email: string) => void;
  setUid: (uid: string) => void;
  setTheme: (theme: ThemeTypes) => void;
  setLightColors: (theme: Partial<NodeColors>) => void;
  setDarkColors: (theme: Partial<NodeColors>) => void;
  setPreferences: (theme: Partial<Prefereces>) => void;
}

export const initialLight = {
  accent: '#0068f6',
  textNode: '#0068f6',
  answerNode: '#e9891b',
  conditionNode: '#424242',
};

export const initialDark: NodeColors = {
  accent: '#4493ff',
  textNode: '#4493ff',
  answerNode: '#e9891b',
  conditionNode: '#eee',
};

const useUserStore = create<UserStore>(
  persist(
    {
      key: 'userStore',
      allowlist: ['theme', 'nodeColors', 'preferences'],
    },
    (set) => ({
      email: '',
      uid: '',
      theme: 'auto',
      nodeColors: { light: initialLight, dark: initialDark },
      preferences: {
        showNodeIds: true,
        showConditionsConnections: false,
        duplicateEdgesWhenAltDragging: false,
      },
      setEmail: (email) => set(() => ({ email })),
      setUid: (uid) => set(() => ({ uid })),
      setTheme: (theme) => set(() => ({ theme })),
      setLightColors: (colors) =>
        set((state) => ({
          nodeColors: { ...state.nodeColors, light: { ...state.nodeColors.light, ...colors } },
        })),
      setDarkColors: (colors) =>
        set((state) => ({
          nodeColors: { ...state.nodeColors, dark: { ...state.nodeColors.dark, ...colors } },
        })),
      setPreferences: (preferences) =>
        set((old) => ({ ...old, preferences: { ...old.preferences, ...preferences } })),
    })
  )
);

export default useUserStore;
