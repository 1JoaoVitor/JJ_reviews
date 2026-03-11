import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

export function usePushNotifications(userId?: string) {
   useEffect(() => {
      // Só funciona se estivermos no mobile e se o usuário estiver logado
      if (!userId || !Capacitor.isNativePlatform()) return;

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
            await PushNotifications.addListener('registration', async (token) => {
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

            await PushNotifications.addListener('registrationError', (error) => {
               console.error('Erro ao registar no Firebase:', error);
            });

            // Ouve notificações quando o app está ABERTO (Foreground)
            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
               console.log('Notificação recebida com o app aberto:', notification);
            });

            // Ouve quando o utilizador TOCA na notificação
            await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
               console.log('Utilizador tocou na notificação:', action);
            });

         } catch (error) {
            console.error('Erro na configuração de Push Notifications:', error);
         }
      };

      setupPush();

      // Limpeza de segurança ao sair do aplicativo
      return () => {
         if (Capacitor.isNativePlatform()) {
            PushNotifications.removeAllListeners();
         }
      };
   }, [userId]);
}