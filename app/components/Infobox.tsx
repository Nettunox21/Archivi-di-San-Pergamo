"use client";

import { useRef } from "react";

type Fazione = {
  nome?: string;
  bandiera: string;
  descrizione: string;
};

interface InfoboxProps {
  title: string;
  /** Retrocompatibilità: singola immagine (pagine paese) */
  image?: string;
  /** Galleria scorrevole di immagini (pagine guerra) */
  images?: string[];
  /** Campi semplici chiave/valore: Data, Luogo, Casus Belli, Esito, Modifiche territoriali... */
  data?: Record<string, any>;
  /** Elenco fazioni coinvolte: bandiera 9:16 a sinistra, descrizione a destra */
  fazioni?: Fazione[];
}

export default function Infobox({ title, image, images, data, fazioni }: InfoboxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Se sono presenti "images" usa la galleria, altrimenti fallback alla singola "image"
  const gallery = images && images.length > 0 ? images : image ? [image] : [];

  const scrollByAmount = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <aside className="infobox">
      {gallery.length > 0 && (
        <div className="infobox-gallery">
          <div className="infobox-gallery-track" ref={scrollRef}>
            {gallery.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${title} - immagine ${i + 1}`}
                className="infobox-gallery-image"
              />
            ))}
          </div>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                className="infobox-gallery-arrow infobox-gallery-arrow-left"
                onClick={() => scrollByAmount(-260)}
                aria-label="Immagine precedente"
              >
                ‹
              </button>
              <button
                type="button"
                className="infobox-gallery-arrow infobox-gallery-arrow-right"
                onClick={() => scrollByAmount(260)}
                aria-label="Immagine successiva"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}

      <h2>{title}</h2>

      {data && Object.keys(data).length > 0 && (
        <table>
          <tbody>
            {Object.entries(data).map(([key, value]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {fazioni && fazioni.length > 0 && (
        <div className="infobox-fazioni">
          <h3>Fazioni coinvolte</h3>
          {fazioni.map((f, i) => (
            <div className="infobox-fazione" key={i}>
              <img
                src={f.bandiera}
                alt={f.nome ?? `Fazione ${i + 1}`}
                className="infobox-fazione-flag"
              />
              <div className="infobox-fazione-desc">
                {f.nome && <strong>{f.nome}</strong>}
                <p>{f.descrizione}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
