/* Taqdom.ai — Supabase public configuration (publishable key only; safe for browsers) */
window.TAQDOM_CONFIG = {
  SUPABASE_URL: "https://adlajwbaygnwfwxbnsle.supabase.co",
  SUPABASE_KEY: "sb_publishable_wMKkGnXIkuHLUJ2ZoaYJEQ_MZycm9ru",
  PLATFORM_FEE_PCT: 1.5,
  ADMIN_EMAIL: "admin@taqdom.me",
  PAYMENTS: {
    paymob: { enabled: false, note的总体: "Activation pending — merchant keys required" },
    crypto: {
      enabled: true,
      networks: [
        { label: "USDC · ERC-20", address: "0x0000000000000000000000000000000000000000" },
        { label: "USDC · TRC-20", address: "TAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }
      ]
    }
  }
};
