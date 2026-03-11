import { createClient } from 'npm:@supabase/supabase-js@2'
import { initializeApp, cert, getApps } from 'npm:firebase-admin/app'
import { getMessaging } from 'npm:firebase-admin/messaging'

const serviceAccount = {
  projectId: Deno.env.get('FIREBASE_PROJECT_ID'),
  clientEmail: Deno.env.get('FIREBASE_CLIENT_EMAIL'),
  privateKey: Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
};

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();

    if (payload.type !== 'INSERT') {
       return new Response("Não é um evento de inserção", { status: 200 });
    }

    const notification = payload.record;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── BUSCAR O NOME DO REMETENTE ───
    let senderName = "Alguém";
    if (notification.sender_id) {
       const { data: senderData } = await supabase
         .from('profiles') 
         .select('username')
         .eq('id', notification.sender_id)
         .maybeSingle();

       if (senderData && senderData.username) {
          senderName = `@${senderData.username}`;
       }
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', notification.user_id)
      .single();

    if (tokenError || !tokenData) {
      console.log("O utilizador não tem a aplicação instalada ou token registado:", notification.user_id);
      return new Response("Sem token FCM", { status: 200 });
    }

    let title = "JJ Reviews";
    if (notification.type === 'list_invite') title = "Novo Convite de Lista! 🍿";
    else if (notification.type === 'movie_added') title = "Novo Filme Adicionado! 🎬";
    else if (notification.type === 'friend_request') title = "Novo Pedido de Amizade! 🤝";

    // ─── JUNTAR O NOME À MENSAGEM ───
    const finalBodyMessage = `${senderName} ${notification.message}`;

    const message = {
      token: tokenData.token,
      notification: {
         title: title,
         body: finalBodyMessage,
      },
      data: {
         type: notification.type,
         reference_id: notification.reference_id || "",
      }
    };

    const response = await getMessaging().send(message);
    console.log("Notificação enviada com sucesso para o telemóvel:", response);

    return new Response(JSON.stringify({ success: true }), { 
       status: 200, 
       headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
     console.error("Erro fatal ao enviar push:", error);
     return new Response(JSON.stringify({ error: (error as Error).message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
     });
  }
});