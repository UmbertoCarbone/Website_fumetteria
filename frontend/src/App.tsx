import { useEffect, useState } from "react";

// Struttura reale restituita da GET /api/products
// (vedi productController.ts -> getProducts, con gli include)
interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  images: string[];
  price: string; // Prisma Decimal arriva come stringa via JSON
  stock: number;
  isAvailable: boolean;
  category: { id: number; name: string; slug: string };
  franchise: { id: number; name: string; slug: string } | null;
  card: { set: string; rarity: string; number: string; variant: string } | null;
  funkoPop: {
    boxNumber: number;
    isChase: boolean;
    stickerExclusive: string | null;
  } | null;
  manga: {
    volume: number | null;
    authors: string[];
    synopsis: string | null;
  } | null;
  boardGame: {
    minPlayers: number | null;
    maxPlayers: number | null;
    yearPublished: number | null;
  } | null;
}

// Renderizza solo i campi del dettaglio che è effettivamente presente,
// senza dover sapere in anticipo di che tipo è il prodotto
function ProductDetails({ product }: { product: Product }) {
  if (product.card) {
    return (
      <>
        <p>
          <strong>Set:</strong> {product.card.set}
        </p>
        <p>
          <strong>Rarità:</strong> {product.card.rarity}
        </p>
        <p>
          <strong>N°:</strong> {product.card.number}
        </p>
      </>
    );
  }
  if (product.manga) {
    return (
      <>
        <p>
          <strong>Volume:</strong> {product.manga.volume ?? "N/D"}
        </p>
        <p>
          <strong>Autori:</strong> {product.manga.authors.join(", ") || "N/D"}
        </p>
      </>
    );
  }
  if (product.funkoPop) {
    return (
      <>
        <p>
          <strong>Box n°:</strong> {product.funkoPop.boxNumber}
        </p>
        {product.funkoPop.isChase && (
          <p>
            <strong>Chase!</strong>
          </p>
        )}
      </>
    );
  }
  if (product.boardGame) {
    return (
      <>
        <p>
          <strong>Giocatori:</strong> {product.boardGame.minPlayers ?? "?"}-
          {product.boardGame.maxPlayers ?? "?"}
        </p>
        <p>
          <strong>Anno:</strong> {product.boardGame.yearPublished ?? "N/D"}
        </p>
      </>
    );
  }
  return <p style={{ color: "#999" }}>Nessun dettaglio specifico</p>;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:5121/api/products");

        if (!response.ok) {
          throw new Error("Errore durante il recupero dei prodotti dal server");
        }

        const data: Product[] = await response.json();
        setProducts(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div>Caricamento prodotti...</div>;
  if (error) return <div>Errore: {error}</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Catalogo completo ({products.length} prodotti)</h1>
      <div
        style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        }}
      >
        {products.map((item) => (
          <div
            key={item.id}
            style={{
              border: "2px solid #6200ea",
              padding: "15px",
              borderRadius: "12px",
            }}
          >
            {item.images.length > 0 ? (
              <img
                src={item.images[0]}
                alt={item.name}
                style={{
                  width: "100%",
                  height: "160px",
                  objectFit: "contain",
                  marginBottom: "10px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "160px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f0f0f0",
                  color: "#999",
                  marginBottom: "10px",
                }}
              >
                Nessuna immagine
              </div>
            )}

            <h3 style={{ color: "#6200ea", margin: "0 0 10px 0" }}>
              {item.name}
            </h3>

            <p style={{ fontSize: "0.75em", color: "#888" }}>
              {item.category.name}
              {item.franchise ? ` · ${item.franchise.name}` : ""}
            </p>

            <ProductDetails product={item} />

            <p>
              <strong>Prezzo:</strong> €{item.price}
            </p>
            <p>
              <strong>Disponibile:</strong> {item.isAvailable ? "Sì" : "No"} (
              {item.stock} pz)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
