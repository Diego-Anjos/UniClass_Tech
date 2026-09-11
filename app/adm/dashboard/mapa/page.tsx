"use client";

import { useEffect, useState } from "react";
import { MapaSalas } from "@/components/MapaSalas";
import { lerSessaoAdmin, type AdminSession } from "@/lib/admin-session";

export default function AdmMapaPage() {
  const [admLogado, setAdmLogado] = useState<AdminSession | null>(null);

  useEffect(() => {
    setAdmLogado(lerSessaoAdmin());
  }, []);

  return (
    <div className="text-white">
      <MapaSalas
        usuarioLogado={admLogado ? { nome: admLogado.nome } : null}
        role="adm"
      />
    </div>
  );
}
