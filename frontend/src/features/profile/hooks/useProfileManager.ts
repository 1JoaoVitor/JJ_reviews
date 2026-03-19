import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";
import type { Session } from "@supabase/supabase-js";
import { sanitizeUsername, validateUsername } from "../logic/profileInput";
import {
   fetchUserProfile,
   updateUserProfileName,
   uploadUserAvatar,
} from "../services/profileService";

type OnProfileChanged = (newUsername: string) => void | Promise<void>;

export function useProfileManager(session: Session | null, onProfileChanged?: OnProfileChanged) {
   const [username, setUsername] = useState("");
   const [currentUsernameState, setCurrentUsernameState] = useState("");
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);

   // Estados do Cropper
   const [imageSrc, setImageSrc] = useState<string | null>(null);
   const [crop, setCrop] = useState({ x: 0, y: 0 });
   const [zoom, setZoom] = useState(1);
   const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
   const [uploading, setUploading] = useState(false);

   useEffect(() => {
      const fetchProfileData = async () => {
         if (!session?.user.id) return;
         try {
            const data = await fetchUserProfile(session.user.id);
            setAvatarUrl(data.avatarUrl);
            setUsername(data.username);
            setCurrentUsernameState(data.username);
         } catch (err) {
            console.error("Erro ao carregar perfil:", err);
         }
      };
      fetchProfileData();
   }, [session]);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
         setImageSrc(URL.createObjectURL(e.target.files[0]));
      }
   };

   const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
   }, []);

   const handleUploadCroppedImage = async () => {
      if (!imageSrc || !croppedAreaPixels || !session?.user.id) return;

      try {
         setUploading(true);
         const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
         if (!croppedImageBlob) throw new Error("Erro ao processar imagem.");

         const publicUrl = await uploadUserAvatar(session.user.id, croppedImageBlob);

         setAvatarUrl(publicUrl);
         setImageSrc(null);
         toast.success("Foto de perfil atualizada com sucesso!");
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Erro ao fazer upload da imagem.");
      } finally {
         setUploading(false);
      }
   };

   const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(sanitizeUsername(e.target.value));
   };

   const handleSaveUsername = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!session?.user.id) return;

      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
         return toast.error(usernameValidation.error || "Nome de usuário inválido.");
      }

      setLoading(true);
      try {
         await updateUserProfileName(session.user.id, username);
         toast.success("Perfil atualizado com sucesso!");
         setCurrentUsernameState(username);
         if (onProfileChanged) {
            await onProfileChanged(username);
         }
      } catch (err) {
         if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "23505") {
            toast.error("Este nome de usuário já está em uso.");
         } else {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar perfil.");
         }
      } finally {
         setLoading(false);
      }
   };

   return {
      username, currentUsernameState, avatarUrl, loading,
      imageSrc, crop, zoom, uploading,
      setImageSrc, setCrop, setZoom,
      handleFileChange, onCropComplete, handleUploadCroppedImage,
      handleUsernameChange, handleSaveUsername
   };
}