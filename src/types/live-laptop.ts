export type LiveLaptop = {
  id: string;
  name: string;
  url: string;
  image: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  available: boolean;
  specs: { label: string; value: string }[];
};

export type LiveLaptopsResponse = {
  products: LiveLaptop[];
  fetchedAt: string;
  error?: string;
};
