import { useEffect, useState } from "react";

// Interfaccia specifica per il prodotto di tipo CARD
interface Product {
  id: number;
  name: string;
  type: string;
  card?: { set: string; rarity: string; number: string };
  // ... altri campi
}

interface CardProduct extends Product {
  type: 'CARD';
  card: { set: string; rarity: string; number: string };
}

function App() {
  const [cards, setCards] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch("http://localhost:0000/api/products");

        if (!response.ok) {
          throw new Error("Errore durante il recupero dei prodotti dal server");
        }

        const allData: Product[] = await response.json();

        // Filtriamo i prodotti assicurandoci che p.type sia 'CARD'
        // e che l'oggetto card non sia null/undefined
        const onlyCards = allData.filter(
          (p): p is CardProduct => p.type === "CARD" && p.card !== undefined,
        );

        setCards(onlyCards);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Si è verificato un errore sconosciuto");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  if (loading) return <div>Caricamento collezione carte...</div>;
  if (error) return <div>Errore: {error}</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Collezione Carte</h1>
      <div
        style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        }}
      >
        {cards.map((item) => (
          <div
            key={item.id}
            style={{
              border: "2px solid #6200ea",
              padding: "15px",
              borderRadius: "12px",
            }}
          >
            <h3 style={{ color: "#6200ea", margin: "0 0 10px 0" }}>
              {item.name}
            </h3>
            <p>
              <strong>Set:</strong> {item.card.set}
            </p>
            <p>
              <strong>Rarità:</strong> {item.card.rarity}
            </p>
            <p>
              <strong>N°:</strong> {item.card.number}
            </p>
            <p>
              <strong>Prezzo:</strong> €{item.price}
            </p>
            <p style={{ fontSize: "0.8em", color: "#666" }}>
              Franchise: {item.franchise?.nameFranchise}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
