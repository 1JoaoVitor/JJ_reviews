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

function resolvePushTitle(notification: { type?: string; message?: string }): string {
  if (notification.type === 'list_invite') return 'Novo Convite de Lista!';
  if (notification.type === 'movie_added') return 'Novo Filme Adicionado!';
  if (notification.type === 'friend_accepted') return 'Pedido de Amizade Aceito!';
  if (notification.type === 'friend_removed') return 'Atualização de Amizade';
  if (notification.type === 'friend_request') {
    if ((notification.message || '').toLowerCase().includes('aceitou')) {
      return 'Pedido de Amizade Aceito!';
    }
    return 'Novo Pedido de Amizade!';
  }

  return 'JJ Reviews';
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
      .limit(10);

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.log("O utilizador não tem a aplicação instalada ou token registado:", notification.user_id);
      return new Response("Sem token FCM", { status: 200 });
    }

    const tokens = Array.from(
      new Set(
        tokenData
          .map((row) => row.token)
          .filter((token): token is string => !!token)
      )
    );

    if (tokens.length === 0) {
      console.log("Sem tokens válidos para envio:", notification.user_id);
      return new Response("Sem token FCM", { status: 200 });
    }

    const title = resolvePushTitle(notification);

    // ─── JUNTAR O NOME À MENSAGEM ───
    const finalBodyMessage = `${senderName} ${notification.message}`;

    const message = {
      tokens,
      notification: {
         title: title,
         body: finalBodyMessage,
      },
      data: {
         type: notification.type,
         reference_id: notification.reference_id || "",
      }
    };

    const response = await getMessaging().sendEachForMulticast(message);
    console.log("Push enviado:", {
      userId: notification.user_id,
      totalTokens: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

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