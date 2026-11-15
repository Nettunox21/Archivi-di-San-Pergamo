/**
 * fazione    = nazione con economia propria
 * territorio = territorio neutro (es. un parco), con economia propria
 * istituto   = ente governativo: sta dentro le nazioni collegate (vedi content/fazioni/enti.md)
 *              e non compare nella lista dell'economia
 */
export type TipoFazione = "fazione" | "territorio" | "istituto";

export type Faction = {
    name: string;
    tipo: TipoFazione;
    banner: string;
    description: string;
    info: string;
    slug: string;
};

export const factions: Faction[] = [
    {
        name: "San Pergamo",
        tipo: "fazione",
        banner: "/images/SanPergamoBanner.jpeg",
        description: "Nazione dell'Ordine",
        info: "Fondata dal Priore",
        slug: "san-pergamo",
    },
    {
        name: "Profitgrado",
        tipo: "fazione",
        banner: "/images/ProfitgradoBanner.jpeg",
        description: "Capitale del capitale",
        info: "Principe erede di Von Profit",
        slug: "profitgrado",
    },
    {
        name: "Falconia",
        tipo: "fazione",
        banner: "/images/FalconiaBanner.jpeg",
        description: "Regno dei Falchi",
        info: "Sovrano erede di Arstozka",
        slug: "falconia",
    },
    {
        name: "SENPAI",
        tipo: "istituto",
        banner: "/images/SENPAIBanner.jpeg",
        description: "Luogo di nascita dell'MRP, studio di anomalie spaziali",
        info: "San Ernesto – Pergamo (e) Profitgrado Atomic Institute",
        slug: "senpai",
    },
    {
        name: "FIORD",
        tipo: "istituto",
        banner: "/images/FIORD.png",
        description: "Sviluppo di armi",
        info: "Falconia Institute of Research & Development",
        slug: "fiord",
    },
    {
        name: "Calkiria",
        tipo: "fazione",
        banner: "/images/CalkiriaBanner.jpeg",
        description: "Nei pressi di Boschetti Bisunti",
        info: "Informazioni aggiuntive",
        slug: "Calkiria",
    },
    {
        name: "Lil'Pisa",
        tipo: "territorio",
        banner: "/images/LilPisaBanner.jpeg",
        description: "Parco Nazionale gestito dalla Mambo's Industries",
        info: "Informazioni aggiuntive",
        slug: "lil-pisa",
    },
        {
        name: "Abetonia",
        tipo: "fazione",
        banner: "/images/Abetonia.png",
        description: "Descrizione breve.",
        info: "Informazioni aggiuntive",
        slug: "Abetonia",
    },
];
