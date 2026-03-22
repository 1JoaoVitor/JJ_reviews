import { useEffect } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

function getPushRedirectPath(type?: string, referenceId?: string): string {
   if (type === 'list_invite') {
      return referenceId ? `/?aba=lists&listId=${referenceId}` : '/?aba=lists';
   }

   if (type === 'movie_added') {
      return '/social?tab=diary';
   }

   if (type === 'friend_request' || type === 'friend_accepted' || type === 'friend_removed') {
      return '/social?tab=friends';
   }

   return '/';
}

export function usePushNotifications(userId?: string) {
   useEffect(() => {
      // Só funciona se estivermos no mobile e se o usuário estiver logado
      if (!userId || !Capacitor.isNativePlatform()) return;

      let registrationHandle: PluginListenerHandle | null = null;
      let registrationErrorHandle: PluginListenerHandle | null = null;
      let pushReceivedHandle: PluginListenerHandle | null = null;
      let pushActionHandle: PluginListenerHandle | null = null;

      const setupPush = async () => {
         try {
            // Pede permissão ao usuário 
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
               permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
               console.log('Permissão para notificações negada pelo utilizador.');
               return;
            }

            // Regista o dispositivo no Firebase
            await PushNotifications.register();

            // Ouve a resposta do Firebase com o "Token" 
            registrationHandle = await PushNotifications.addListener('registration', async (token) => {
               console.log('FCM Token recebido:', token.value);

               // Guarda o token na tabela do Supabase
               if (token.value) {
                  const { error } = await supabase
                     .from('fcm_tokens')
                     .upsert(
                        { user_id: userId, token: token.value },
                        { onConflict: 'token' } // Atualiza se o token já existir
                     );
                     
                  if (error) console.error('Erro ao guardar FCM token no Supabase:', error);
               }
            });

            registrationErrorHandle = await PushNotifications.addListener('registrationError', (error) => {
               console.error('Erro ao registar no Firebase:', error);
            });

            // Ouve notificações quando o app está ABERTO (Foreground)
            pushReceivedHandle = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
               console.log('Notificação recebida com o app aberto:', notification);
            });

            // Ouve quando o utilizador TOCA na notificação
            pushActionHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
               console.log('Utilizador tocou na notificação:', action);
               const data = action.notification?.data as { type?: string; reference_id?: string } | undefined;
               const targetPath = getPushRedirectPath(data?.type, data?.reference_id);
               window.location.assign(targetPath);
            });

         } catch (error) {
            console.error('Erro na configuração de Push Notifications:', error);
         }
      };

      setupPush();

      // Limpeza de segurança ao sair do aplicativo
      return () => {
         if (registrationHandle) registrationHandle.remove();
         if (registrationErrorHandle) registrationErrorHandle.remove();
         if (pushReceivedHandle) pushReceivedHandle.remove();
         if (pushActionHandle) pushActionHandle.remove();
      };
   }, [userId]);
}