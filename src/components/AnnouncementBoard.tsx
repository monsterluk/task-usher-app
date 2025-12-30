import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { announcementsApi, isDemoMode } from '@/utils/api';
import { Megaphone, Plus, Trash2, Pin, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: number;
  title: string;
  content: string;
  author_name: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  created_at: string;
}

const AnnouncementBoard = () => {
  const { currentUser } = useApp();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal' as const,
    is_pinned: false
  });

  // ADMIN, KIEROWNIK i HANDLOWIEC mogą dodawać ogłoszenia
  const canAdd = currentUser?.role === 'ADMIN' || currentUser?.role === 'KIEROWNIK' || currentUser?.role === 'HANDLOWIEC';
  // Tylko ADMIN i KIEROWNIK mogą usuwać
  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'KIEROWNIK';

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    if (isDemoMode()) {
      // Demo data
      setAnnouncements([
        {
          id: 1,
          title: 'Witamy w PlexiSystem!',
          content: 'System zarządzania produkcją jest gotowy do użycia.',
          author_name: 'System',
          priority: 'high',
          is_pinned: true,
          created_at: new Date().toISOString()
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      const response = await announcementsApi.getAll();
      setAnnouncements(response.data?.announcements || []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({ title: "Uzupełnij tytuł i treść", variant: "destructive" });
      return;
    }

    try {
      const response = await announcementsApi.create(newAnnouncement);
      if (response.success) {
        setAnnouncements(prev => [response.data.announcement, ...prev]);
        setNewAnnouncement({ title: '', content: '', priority: 'normal', is_pinned: false });
        setShowForm(false);
        toast({ title: "Ogłoszenie dodane" });
      }
    } catch (error) {
      toast({ title: "Błąd przy dodawaniu ogłoszenia", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć to ogłoszenie?')) return;

    try {
      await announcementsApi.delete(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast({ title: "Ogłoszenie usunięte" });
    } catch (error) {
      toast({ title: "Błąd przy usuwaniu", variant: "destructive" });
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20';
      case 'high': return 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'normal': return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
      case 'low': return 'border-l-4 border-l-gray-400 bg-gray-50 dark:bg-gray-950/20';
      default: return 'border-l-4 border-l-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle size={16} className="text-red-500" />;
      case 'high': return <AlertTriangle size={16} className="text-orange-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="card-industrial">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded" />
          <div className="h-6 w-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-industrial">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Megaphone size={24} className="text-primary" />
          Tablica Ogłoszeń
        </h2>
        {canAdd && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span className="ml-1">{showForm ? 'Anuluj' : 'Dodaj'}</span>
          </button>
        )}
      </div>

      {/* Form for new announcement */}
      {showForm && canAdd && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Tytuł ogłoszenia"
              value={newAnnouncement.title}
              onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
              className="input-industrial w-full"
            />
            <textarea
              placeholder="Treść ogłoszenia..."
              value={newAnnouncement.content}
              onChange={e => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
              className="input-industrial w-full h-24 resize-none"
            />
            <div className="flex flex-wrap gap-4 items-center">
              <select
                value={newAnnouncement.priority}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, priority: e.target.value as any }))}
                className="input-industrial"
              >
                <option value="low">Niski priorytet</option>
                <option value="normal">Normalny</option>
                <option value="high">Wysoki</option>
                <option value="urgent">Pilne!</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAnnouncement.is_pinned}
                  onChange={e => setNewAnnouncement(prev => ({ ...prev, is_pinned: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Pin size={16} />
                Przypnij na górze
              </label>
              <button onClick={handleCreate} className="btn-primary ml-auto">
                Opublikuj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Brak ogłoszeń
        </p>
      ) : (
        <div className="space-y-3">
          {announcements.map(announcement => (
            <div
              key={announcement.id}
              className={`p-4 rounded-lg ${getPriorityStyle(announcement.priority)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {announcement.is_pinned && <Pin size={14} className="text-primary" />}
                  {getPriorityIcon(announcement.priority)}
                  <h3 className="font-semibold">{announcement.title}</h3>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Usuń ogłoszenie"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{announcement.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {announcement.author_name} • {formatDate(announcement.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementBoard;
