// Página raíz: acá no hay nada que ver sin un link firmado — se orienta
// amablemente a quien cae de casualidad.
export default function Home() {
  return (
    <div className="tarjeta text-center">
      <p className="mb-2 text-4xl">💊</p>
      <h1 className="font-serif text-3xl font-bold text-tinta">Tu tratamiento PILL.AR</h1>
      <p className="mt-2 text-sm text-slate-600">
        Para ver tu cotización, entrá desde el link que te mandamos por WhatsApp. Si no lo tenés a
        mano, escribinos y te lo reenviamos.
      </p>
    </div>
  );
}
