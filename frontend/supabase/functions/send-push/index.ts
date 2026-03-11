import { createClient } from 'npm:@supabase/supabase-js@2'
import { initializeApp, cert, getApps } from 'npm:firebase-admin/app'
import { getMessaging } from 'npm:firebase-admin/messaging'

// Configuração do Firebase 
const serviceAccount = {
  projectId: Deno.env.get('FIREBASE_PROJECT_ID'),
  clientEmail: Deno.env.get('FIREBASE_CLIENT_EMAIL'),
  // O replace é necessário para o Deno ler as quebras de linha da chave privada corretamente
  privateKey: Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
};

// Inicializa o Firebase apenas se ainda não estiver inicializado
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

Deno.serve(async (req: Request) => {
  try {
    // Recebe o pacote do Supabase (A notificação)
    const payload = await req.json();

    // NOVA notificação foi inserida
    if (payload.type !== 'INSERT') {
       return new Response("Não é um evento de inserção", { status: 200 });
    }

    const notification = payload.record;

    // Conecta ao Supabase usando as chaves de Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Procura o Token do recebedor
    const { data: tokenData, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', notification.user_id)
      .single();

    if (tokenError || !tokenData) {
      console.log("O utilizador não tem a aplicação instalada ou token registado:", notification.user_id);
      return new Response("Sem token FCM", { status: 200 });
    }

    // Prepara o Título e a Mensagem
    let title = "JJ Reviews";
    if (notification.type === 'list_invite') title = "Novo Convite de Lista! 🍿";
    else if (notification.type === 'movie_added') title = "Novo Filme Adicionado! 🎬";
    else if (notification.type === 'friend_request') title = "Novo Pedido de Amizade! 🤝";

    const message = {
      token: tokenData.token,
      notification: {
         title: title,
         body: notification.message,
      },
      data: {
         type: notification.type,
         reference_id: notification.reference_id || "",
      }
    };

    // Envia a carta para o Firebase
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