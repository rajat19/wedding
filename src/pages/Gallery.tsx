import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { Upload, Download, Image as ImageIcon } from "lucide-react";

interface Photo {
  id: string;
  file_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  caption: string | null;
  album_name: string | null;
  created_at: string;
  url?: string;
}

const Gallery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [albumName, setAlbumName] = useState("Wedding Day");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchPhotos();
  }, [user, navigate]);

  const fetchPhotos = async () => {
    const photosRef = collection(db, "photos");
    const q = query(photosRef, orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    const base = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Photo[];
    const withUrls = await Promise.all(
      base.map(async (p) => {
        try {
          const url = await getDownloadURL(storageRef(storage, p.file_path));
          return { ...p, url };
        } catch {
          return { ...p, url: undefined };
        }
      }),
    );
    setPhotos(withUrls);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a valid image file (JPG, PNG, or WebP)");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `wedding-photos/${fileName}`;

      // Upload to Firebase Storage
      const ref = storageRef(storage, filePath);
      await uploadBytes(ref, selectedFile);

      // Save metadata to Firestore
      await addDoc(collection(db, "photos"), {
        uploader_id: user.id,
        file_path: filePath,
        original_filename: selectedFile.name,
        caption: caption || null,
        album_name: albumName || null,
        created_at: new Date().toISOString(),
      });

      toast.success("Photo uploaded successfully!");
      setSelectedFile(null);
      setCaption("");
      fetchPhotos();
    } catch (error) {
      toast.error("An error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  const downloadPhoto = async (photo: Photo) => {
    try {
      const url = photo.url || (await getDownloadURL(storageRef(storage, photo.file_path)));
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = photo.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Failed to download photo");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Photo Gallery</h1>
          <p className="text-xl text-muted-foreground">Share and cherish our special moments</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-12">
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-xl font-serif font-bold">Upload Photos</h3>

            <div className="space-y-2">
              <Label htmlFor="photo">Select Photo (Max 10MB)</Label>
              <Input
                id="photo"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="album">Album Name</Label>
              <Input
                id="album"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder="Wedding Day"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
              />
            </div>

            <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </CardContent>
        </Card>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No photos yet. Be the first to upload!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <div className="aspect-square bg-muted">
                  <img
                    src={photo.url || ""}
                    alt={photo.caption || photo.original_filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="pt-4 space-y-2">
                  {photo.caption && (
                    <p className="text-sm text-muted-foreground">{photo.caption}</p>
                  )}
                  {photo.album_name && (
                    <p className="text-xs text-muted-foreground">Album: {photo.album_name}</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => downloadPhoto(photo)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
