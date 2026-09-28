import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchBusImages, fetchBuses, deleteBusImage, busLabel, extractErrorMessage } from '@/services/busImageService';
import type { BusImage } from '@/types/busImage.types';
import type { BusRef } from '@/types/busAmenityMapping.types';

export default function BusImagesDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [image, setImage] = useState<BusImage | null>(null);
  const [bus, setBus] = useState<BusRef | undefined>();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [images, buses] = await Promise.all([fetchBusImages(), fetchBuses()]);
        const found = images.find((i) => i.id === id) ?? null;
        setImage(found);
        setBus(buses.find((b) => b.id === found?.busId));
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleDelete() {
    if (!image || !window.confirm('Delete this image?')) return;
    setDeleting(true);
    try {
      await deleteBusImage(image.id);
      toast.success('Deleted.');
      navigate('/admin/bus-images');
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" />
        Loading...
      </div>
    );
  }

  if (!image) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        Image not found — it may have already been deleted.
        <div className="mt-3">
          <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/bus-images')}>
            Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 560 }}>
      <h4 className="mb-3">
        <i className="fa-solid fa-image me-2" />
        Bus Image
      </h4>

      <img src={image.imageUrl} alt={image.caption ?? ''} className="rounded border mb-3" style={{ maxWidth: '100%', maxHeight: 280 }} />

      <dl className="row">
        <dt className="col-sm-4">Bus</dt>
        <dd className="col-sm-8">{busLabel(bus)}</dd>

        <dt className="col-sm-4">Caption</dt>
        <dd className="col-sm-8">{image.caption || <span className="text-muted">None</span>}</dd>

        <dt className="col-sm-4">Primary</dt>
        <dd className="col-sm-8">{image.isPrimary ? <span className="badge bg-success">Yes</span> : 'No'}</dd>

        <dt className="col-sm-4">Display order</dt>
        <dd className="col-sm-8">{image.displayOrder}</dd>

        <dt className="col-sm-4">Created</dt>
        <dd className="col-sm-8">{new Date(image.createdAtUtc).toLocaleString()}</dd>
      </dl>

      <div className="d-flex gap-2">
        <button className="btn btn-outline-primary" onClick={() => navigate(`/admin/bus-images/${image.id}/edit`)}>
          <i className="fa-solid fa-pen me-1" />
          Edit
        </button>
        <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
          {deleting ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-trash me-1" />}
          Delete
        </button>
        <button className="btn btn-outline-secondary ms-auto" onClick={() => navigate('/admin/bus-images')}>
          Back
        </button>
      </div>
    </div>
  );
}
