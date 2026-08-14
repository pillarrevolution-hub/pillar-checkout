// back_url de Mercado Pago (success y pending).
export default function Gracias({ searchParams }: { searchParams: { pendiente?: string; status?: string } }) {
  const pendiente = searchParams.pendiente === '1' || searchParams.status === 'pending' || searchParams.status === 'in_process';
  return (
    <div className="card p-8 text-center">
      <p className="mb-2 text-4xl">{pendiente ? '⏳' : '🎉'}</p>
      <h1 className="font-archivo text-xl font-bold text-profundo">
        {pendiente ? 'Pago en proceso' : '¡Pago recibido!'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {pendiente
          ? 'Tu pago está siendo procesado por Mercado Pago. En cuanto se acredite arrancamos con la elaboración y te avisamos por WhatsApp.'
          : 'Ya registramos tu pago y tu pedido entra en elaboración. Te vamos avisando por WhatsApp en cada etapa. ¡Gracias por confiar en PILL.AR! 💙'}
      </p>
    </div>
  );
}
