// Google Identity Services type declarations
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          disableAutoSelect: () => void;
          revoke: (hint: string, callback: () => void) => void;
        };
      };
    };
  }
}

export {};