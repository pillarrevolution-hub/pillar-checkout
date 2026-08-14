// back_url de failure de Mercado Pago.
export default function ErrorPago() {
  return (
    <div className="card p-8 text-center">
      <p className="mb-2 text-4xl">😕</p>
      <h1 className="font-archivo text-xl font-bold text-profundo">El pago no se completó</h1>
      <p className="mt-2 text-sm text-slate-600">
        No te preocupes: no se hizo ningún cargo. Podés volver al link de tu cotización e
        intentarlo de nuevo con otro medio, o escribirnos por WhatsApp y lo resolvemos juntos.
      </p>
    </div>
  );
}
