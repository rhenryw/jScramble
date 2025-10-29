export interface ScrambleOptions {
    obfuscateKeys: boolean;
    obfuscateValues: boolean;
    unicodeHash: boolean;
}

export interface JsonData {
    restaurants: Restaurant[];
}

export interface Restaurant {
    name: string;
    cuisine: string;
    typical_cost: string;
}