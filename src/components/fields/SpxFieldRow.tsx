// The SPX binding of the shared field control: one row wired to the template store. Both SPX
// surfaces render it — the Data panel (sample values, hidden fields included) and the Control
// panel (the operator view, `live` on) — so the two can never disagree about what editing a
// field does.
//
// SPX sample data is a flat string map, so values stringify at this boundary; the control
// itself speaks the shared FieldValue vocabulary (model/fieldModel.ts).

import { useTemplateStore } from '../../store/templateStore';
import { fileToDataUrl, isImageAsset, uniqueAssetPath } from '../../assets/assetUtils';
import type { FieldDescriptor, FieldValue } from '../../model/fieldModel';
import { FieldRow, type FieldImage } from './FieldControl';

export default function SpxFieldRow({ descriptor, live = false }: { descriptor: FieldDescriptor; live?: boolean }) {
  const value = useTemplateStore((s) => s.sampleData[descriptor.key] ?? '');
  const setSampleValue = useTemplateStore((s) => s.setSampleValue);
  const sendControl = useTemplateStore((s) => s.sendControl);
  const assets = useTemplateStore((s) => s.template.assets);
  const addAsset = useTemplateStore((s) => s.addAsset);

  const set = (v: FieldValue) => {
    setSampleValue(descriptor.key, String(v));
    if (live) sendControl('update'); // Google-Docs feel: every edit shows on the preview
  };

  // An image field's value is the asset's relative path (e.g. images/logo.png) — the same path
  // the export bundles and the template's <img> resolves.
  const images: FieldImage[] = assets
    .filter((a) => isImageAsset(a.path))
    .map((a) => ({ value: a.path, src: typeof a.data === 'string' ? a.data : undefined }));

  const upload = (file: File) => {
    void (async () => {
      const path = uniqueAssetPath(file.name, assets);
      addAsset({ path, data: await fileToDataUrl(file) });
      set(path);
    })();
  };

  return (
    <FieldRow
      descriptor={descriptor}
      value={value}
      onChange={set}
      badge={descriptor.key}
      images={images}
      onUpload={upload}
    />
  );
}
