/*
 * Upload direto para o Cloudinary.
 *
 * No Vercel cada requisição ao servidor pode ter no máximo 4,5 MB. Por isso os arquivos
 * vão do navegador direto para o Cloudinary e o servidor recebe só o link, no campo
 * "<nome do campo>__url". Sem Cloudinary configurado (desenvolvimento local), o servidor
 * responde direto=false e tudo continua sendo enviado ao Flask como antes.
 *
 * Uso:
 *   const url = await UploadDireto.enviar(arquivo, "projects");      // null = mandar ao Flask
 *   const fd2 = await UploadDireto.trocarArquivos(formData, "projects");
 *   <form enctype="multipart/form-data" data-upload-direto="membros"> → automático
 */
(function () {
    "use strict";

    let disponivel = true; // vira false quando o servidor diz que não usa Cloudinary

    async function enviar(arquivo, pasta, prefixo) {
        if (!disponivel || !arquivo || !arquivo.size) return null;
        const resp = await fetch("/api/upload/assinatura", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pasta, nome: arquivo.name || "arquivo", prefixo: prefixo || "" })
        });
        const info = await resp.json().catch(() => ({}));
        if (info.direto === false) { disponivel = false; return null; }
        if (!resp.ok || !info.ok) throw new Error(info.error || "Não foi possível preparar o envio do arquivo.");
        if (info.limite_mb && arquivo.size > info.limite_mb * 1024 * 1024) {
            throw new Error(`Arquivo muito grande. O limite é ${info.limite_mb} MB por arquivo.`);
        }

        const fd = new FormData();
        Object.entries(info.params).forEach(([k, v]) => fd.append(k, v));
        fd.append("file", arquivo);
        const up = await fetch(`https://api.cloudinary.com/v1_1/${info.cloud}/${info.tipo}/upload`, { method: "POST", body: fd });
        const res = await up.json().catch(() => ({}));
        if (!up.ok || !res.secure_url) {
            throw new Error((res.error && res.error.message) ? `Falha no envio: ${res.error.message}` : "Falha ao enviar o arquivo. Tente de novo.");
        }
        return res.secure_url;
    }

    // Troca cada arquivo do FormData pelo link no Cloudinary (campo "nome__url").
    async function trocarArquivos(formData, pasta) {
        const saida = new FormData();
        for (const [chave, valor] of formData.entries()) {
            if (valor instanceof File && valor.size) {
                const url = await enviar(valor, pasta);
                if (url) { saida.append(chave + "__url", url); continue; }
            }
            saida.append(chave, valor);
        }
        return saida;
    }

    // Formulários normais (admin): envia os arquivos antes e só então submete o formulário.
    document.addEventListener("submit", async (e) => {
        const form = e.target;
        const pasta = form.dataset && form.dataset.uploadDireto;
        if (!pasta || form.dataset.uploadPronto === "1") return;
        const campos = [...form.querySelectorAll('input[type="file"]')].filter((i) => i.files && i.files.length && !i.disabled);
        if (!campos.length || !disponivel) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        const submitter = e.submitter;
        const botoes = [...form.querySelectorAll('[type="submit"]'), ...document.querySelectorAll(`[type="submit"][form="${form.id}"]`)];
        botoes.forEach((b) => { b.dataset.textoOriginal = b.innerHTML; b.disabled = true; });
        if (submitter) submitter.textContent = "Enviando arquivos…";
        try {
            for (const campo of campos) {
                for (const arquivo of campo.files) {
                    const url = await enviar(arquivo, pasta);
                    if (!url) break; // sem Cloudinary: segue com o envio normal
                    const oculto = document.createElement("input");
                    oculto.type = "hidden";
                    oculto.name = campo.name + "__url";
                    oculto.value = url;
                    form.appendChild(oculto);
                    campo.disabled = true; // o arquivo não vai mais junto do formulário
                }
            }
        } catch (err) {
            botoes.forEach((b) => { b.disabled = false; b.innerHTML = b.dataset.textoOriginal; });
            form.querySelectorAll('input[type="hidden"][name$="__url"]').forEach((i) => i.remove());
            campos.forEach((c) => { c.disabled = false; });
            alert(err.message);
            return;
        }
        botoes.forEach((b) => { b.disabled = false; b.innerHTML = b.dataset.textoOriginal; });
        form.dataset.uploadPronto = "1";
        if (form.requestSubmit) form.requestSubmit(submitter && submitter.form === form ? submitter : undefined);
        else form.submit();
    }, true);

    // Ao voltar para a página pelo histórico, os campos precisam funcionar de novo
    window.addEventListener("pageshow", () => {
        document.querySelectorAll("form[data-upload-pronto]").forEach((form) => {
            delete form.dataset.uploadPronto;
            form.querySelectorAll('input[type="hidden"][name$="__url"]').forEach((i) => i.remove());
            form.querySelectorAll('input[type="file"]').forEach((i) => { i.disabled = false; });
        });
    });

    window.UploadDireto = { enviar, trocarArquivos };
})();
