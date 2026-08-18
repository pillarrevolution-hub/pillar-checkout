// back_url de failure de Mercado Pago.
export default function ErrorPago() {
  return (
    <div className="tarjeta text-center">
      <p className="mb-2 text-4xl">😕</p>
      <h1 className="font-sans text-3xl font-bold text-tinta">El pago no se completó</h1>
      <p className="mt-2 text-sm text-slate-600">
        No te preocupes: no se hizo ningún cargo. Podés volver al link de tu cotización e
        intentarlo de nuevo con otro medio, o escribirnos por WhatsApp y lo resolvemos juntos.
      </p>
    </div>
  );
}
