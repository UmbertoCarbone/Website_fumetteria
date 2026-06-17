import { useState, useEffect } from "react";

interface Product {
  id: number | string;
  name: string;
  description: string;
  price: number;

  imageUrl?: string; // alcuni prodotti usano imageUrl dal backend
}

export default function ComponenTest() {
  const [products, setProducts] = useState<Product[]>([]); // Tipizzato correttamente
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("Errore nella risposta");
        return res.json();
      })
      .then((data: Product[]) => {
        // Diciamo a TS che data è un array di Product
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore fetch:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Caricamento in corso...</div>;

  return (
    <div className="App" style={{ padding: "20px" }}>
      <h1>Test Prodotti</h1>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "8px",
              width: "200px",
            }}
          >
            {/** Mostra immagine prodotto (prima imageUrl, poi image, altrimenti nulla) */}
            {product.imageUrl || product.imageUrl ? (
              <img
                src={product.imageUrl ?? product.imageUrl}
                alt={product.name}
                style={{
                  width: "100%",
                  height: "120px",
                  objectFit: "cover",
                  marginBottom: "8px",
                  borderRadius: "6px",
                }}
              />
            ) : null}
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <span style={{ fontWeight: "bold" }}>{product.price}€</span>
          </div>
        ))}
      </div>
    </div>
  );
}
