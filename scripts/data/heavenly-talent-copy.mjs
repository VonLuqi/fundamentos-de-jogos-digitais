/**
 * Nomes e sabor dos 129 talentos Heavenly (Rio do Lethe), por nome CC de origem.
 * O efeito NÃO é escrito aqui: talentEffectText() gera a frase a partir do efeito real,
 * para o texto nunca divergir do que o talento faz. Usado por gen-heavenly-talent-catalog.mjs.
 */

import { GENERATOR_BY_ID } from '../../js/hades-despertar/config/generators.js';

/** [nome no jogo, frase de sabor] — ordem = CC_ORDER. */
export const TALENT_COPY = Object.freeze({
  Legacy: ['Legado', 'O primeiro gole do Lethe.'],
  'Twin Gates of Transcendence': ['Portões Gêmeos', 'Duas portas que não fecham nem quando você dorme.'],
  'Heavenly cookies': ['Bolachas Celestes', 'O pão dos que já atravessaram.'],
  Angels: ['Anjos', 'Mensageiros que vigiam a margem na sua ausência.'],
  Belphegor: ['Belphegor', 'O daemon da preguiça conta as horas por você.'],
  'Classic dairy selection': ['Ânforas de Leite Ancestral', 'Leite servido nas ânforas dos primeiros mortos.'],
  'How to bake your dragon': ['Ovo Primordial', 'Uma casca morna sob as cinzas do Phlegethon.'],
  'Box of brand biscuits': ['Caixa de Óbolos Cunhados', 'Moedas de Caronte assadas em fornada.'],
  'Box of macarons': ['Caixa de Doces de Perséfone', 'Pequenas romãs açucaradas da rainha.'],
  'Tin of british tea biscuits': ['Lata de Biscoitos de Hermes', 'Para o chá do mensageiro entre duas viagens.'],
  'Tin of butter cookies': ['Lata de Bolachas de Ambrosia', 'Manteiga dos deuses, só um pouco rançosa.'],
  Archangels: ['Arcanjos', 'Asas maiores, vigília mais longa.'],
  Mammon: ['Mamon', 'O avarento estica a maré enquanto você descansa.'],
  'Starter kit': ['Kit Inicial', 'Toda corrida começa com companhia.'],
  'Heavenly luck': ['Sorte Celeste', 'As correntes do Acheron sobem mais vezes.'],
  'Basic wallpaper assortment': ['Tapeçarias do Érebo', 'Paredes de sombra bordada para o Domínio.'],
  Heralds: ['Eco da Turma', 'Os arautos sussurram.'],
  'Permanent upgrade slot I': ['Eco do Styx I', 'Um juramento permanece selado entre corridas.'],
  Abaddon: ['Abadom', 'O destruidor guarda a porta do sono.'],
  Virtues: ['Virtudes', 'Disciplina que trabalha sozinha.'],
  'Persistent memory': ['Memória Persistente', 'O Arquivo Estígio lembra onde parou.'],
  'Lasting fortune': ['Fortuna Duradoura', 'A maré dourada demora a baixar.'],
  'Lucky digit': ['Dígito da Sorte', 'Um número que Caronte sempre aceita.'],
  'Golden switch': ['Chave Dourada', 'Um ferrolho de ouro que mantém a forja acesa.'],
  'Season switcher': ['Roda das Estações', 'Gire o ano do Submundo.'],
  Dominions: ['Dominações', 'Ordens que seguem cumpridas na sua ausência.'],
  Satan: ['Satanás', 'O adversário prolonga a noite.'],
  'Starter kitchen': ['Cozinha Inicial', 'Os remadores já chegam ao cais.'],
  'Decisive fate': ['Destino Decisivo', 'As Moiras cortam o fio na hora certa.'],
  'Kitten angels': ['Filhotes Alados', 'Até os cães do Cérbero ganham asas.'],
  Asmodeus: ['Asmodeu', 'O daemon do desejo não deixa a maré esfriar.'],
  Cherubim: ['Querubins', 'Guardiões de quatro faces sobre o rio.'],
  'Permanent upgrade slot II': ['Eco do Styx II', 'Dois juramentos permanentes na margem.'],
  'Unholy bait': ['Isca Profana', 'Carne velha jogada no Acheron.'],
  'Halo gloves': ['Luvas de Auréola', 'A Foice pesa menos.'],
  'Lucky number': ['Número da Sorte', 'Sete, como os portões.'],
  'Divine discount': ['Desconto Divino', 'Os deuses pechincham por você.'],
  'Divine sales': ['Liquidação Divina', 'Juramentos em promoção no Olimpo.'],
  'Residual luck': ['Sorte Residual', 'Restos de ouro no fundo do rio.'],
  Starlove: ['Estrela de Antestéria', 'O festival das flores chama os Ecos.'],
  Starsnow: ['Estrela de Saturnália', 'A neve de Saturno brilha no Acheron.'],
  Starspawn: ['Estrela de Perséfone', 'A primavera da rainha agita o rio.'],
  Starterror: ['Estrela de Lemúria', 'Os mortos inquietos atraem Ecos.'],
  Startrade: ['Estrela de Hermes', 'Dia de feira, dia de sorte.'],
  Beelzebub: ['Belzebu', 'O senhor das moscas não deixa nada parar.'],
  Seraphim: ['Serafins', 'Fogo que vigia de longe.'],
  'Synergies Vol. I': ['Sinergias Vol. I', 'Malha Styx Vol. I.'],
  'Divine bakeries': ['Padarias Divinas', 'Tudo no Olimpo sai mais em conta.'],
  'Elder spice': ['Especiaria Anciã', 'Um tempero que atrai mais Sanguessugas.'],
  'Sacrilegious corruption': ['Corrupção Sacrílega', 'O que é digerido volta mais gordo.'],
  'Five-finger discount': ['Desconto dos Cinco Dedos', 'Ninguém viu nada.'],
  God: ['Deus', 'Nada escapa ao olhar mais alto.'],
  Lucifer: ['Lúcifer', 'A estrela caída estende a noite inteira.'],
  'Inspired checklist': ['Lista Inspirada', 'Juramentos riscados um a um.'],
  'Golden cookie alert sound': ['Sino do Acheron', 'Um badalo que avisa antes da maré.'],
  'Wrapping paper': ['Mortalhas de Presente', 'Embrulhos fúnebres para as festas.'],
  'Fanciful dairy selection': ['Ânforas de Néctar Raro', 'Leites de sabores que nenhum vivo provou.'],
  'Genius accounting': ['Contabilidade Genial', 'Caronte anota cada óbolo.'],
  'Synergies Vol. II': ['Sinergias Vol. II', 'Malha Styx Vol. II.'],
  'Permanent upgrade slot III': ['Eco do Styx III', 'Três juramentos atravessam o Lethe.'],
  'Label printer': ['Selos de Bronze', 'Cada juramento ganha seu selo.'],
  'Wrinkly cookies': ['Bolachas Enrugadas', 'Assadas no ventre das Sanguessugas.'],
  'Distilled essence of redoubled luck': ['Essência de Sorte Destilada', 'Uma gota que dobra o acaso.'],
  'Distinguished wallpaper assortment': ['Tapeçarias do Olimpo', 'Fios de ouro roubados de cima.'],
  'Unshackled flavor': ['Sabor Liberto', 'O primeiro sabor sem correntes.'],
  'Unshackled cursors': ['Foices Libertas', 'As Mil Foices sem grilhões.'],
  Chimera: ['Quimera', 'Três bestas, uma só vigília.'],
  'Lucky payout': ['Pagamento da Sorte', 'Caronte paga o troco em ouro.'],
  'Eye of the wrinkler': ['Olho da Sanguessuga', 'Você vê o que elas engoliram.'],
  'Stevia Caelestis': ['Estévia Celeste', 'Um doce que não pesa na balança dos Juízes.'],
  'Sugar baking': ['Cozimento de Néctar', 'Néctar guardado é néctar que rende.'],
  'Diabetica Daemonicus': ['Diabetes Demoníaca', 'Açúcar demais deixa a Foice nervosa.'],
  'Permanent upgrade slot IV': ['Eco do Styx IV', 'Quatro juramentos sobrevivem à Catábase.'],
  'Sugar craving': ['Desejo de Néctar', 'Uma vontade que só o Frenesi mata.'],
  'Aura gloves': ['Luvas de Aura', 'Mãos que brilham no escuro.'],
  'Sugar aging process': ['Envelhecer o Néctar', 'O néctar velho é o mais forte.'],
  'Shimmering veil': ['Manto Cintilante', 'Um tecido de luz sobre o Domínio.'],
  'Sucralosia Inutilis': ['Sucralose Inútil', 'Um adoçante que só serve para dar sorte.'],
  'Sugar crystal cookies': ['Bolachas de Cristal de Néctar', 'Crocantes como gelo do Cócito.'],
  Keepsakes: ['Relicários', 'Lembranças de festas passadas.'],
  'Unshackled berrylium': ['Bagálio Liberto', 'Frutos de metal que não enferrujam.'],
  'Unshackled grandmas': ['Servos Libertos', 'Os remadores de Caronte sem correntes.'],
  'Cat ladies': ['Damas dos Filhotes', 'Quem cuida dos cães cuida do Domínio.'],
  'Kitten wages': ['Salário dos Filhotes', 'Ossos mais baratos no mercado.'],
  "Cosmic beginner's luck": ['Sorte de Principiante Cósmica', 'O rio ajuda quem acabou de chegar.'],
  'Reinforced membrane': ['Membrana Reforçada', 'O Manto não rasga tão fácil.'],
  'Unshackled farms': ['Cães Libertos', 'Os Cães Cerberianos soltos da coleira.'],
  'Unshackled blueberrylium': ['Mirtilálio Liberto', 'Um metal azul que pulsa.'],
  'Permanent upgrade slot V': ['Eco do Styx V', 'Cinco juramentos — memória máxima do rio.'],
  'Luminous gloves': ['Luvas Luminosas', 'Cada golpe acende a margem.'],
  'Fortune cookies': ['Óbolos da Sorte', 'Moedas com uma profecia gravada.'],
  'Pet the dragon': ['Afagar o Dragão', 'Ele ronrona fogo.'],
  'Sound test': ['Teste de Lira', 'Afinando a lira de Orfeu.'],
  'Delicate touch': ['Toque Delicado', 'A Foice passa sem rasgar o Manto.'],
  'Unshackled mines': ['Juízes Libertos', 'Os Juízes do Tártaro sem amarras.'],
  'Unshackled chalcedhoney': ['Calcedmel Liberto', 'Mel de pedra escorrendo livre.'],
  'Box of maybe cookies': ['Caixa de Talvez-Bolachas', 'Pode ser que estejam aí dentro.'],
  'Box of not cookies': ['Caixa de Não-Bolachas', 'Definitivamente não são bolachas.'],
  'Box of pastries': ['Caixa de Doces do Elísio', 'Confeitaria dos campos dos bem-aventurados.'],
  'Milkhelp® lactose intolerance relief tablets': ['Pastilhas do Véu', 'Para quem bebe Véu demais.'],
  'Unshackled factories': ['Forjas Libertas', 'O Phlegethon sem represas.'],
  'Unshackled buttergold': ['Manteigouro Liberto', 'Ouro que derrete na boca.'],
  'Unshackled banks': ['Tronos Libertos', 'O Trono de Obsidiana sem dono.'],
  'Unshackled sugarmuck': ['Açucarlodo Liberto', 'Um lodo doce no fundo do rio.'],
  'Unshackled temples': ['Templos Libertos', 'Mnemosyne lembra sem limites.'],
  'Steadfast murmur': ['Murmúrio Firme', 'O Manto sussurra e não cede.'],
  'Unshackled jetmint': ['Menta Negra Liberta', 'Fresca como um túmulo.'],
  'Unshackled wizard towers': ['Torres Libertas', 'As Torres do Estige sem selos.'],
  'Unshackled cherrysilver': ['Cereja-Prata Liberta', 'Fruta que reflete a lua.'],
  'Unshackled shipments': ['Barcas Libertas', 'As Barcas das Estrelas sem âncora.'],
  'Unshackled hazelrald': ['Avelãrald Liberto', 'Uma joia com gosto de noz.'],
  'Unshackled alchemy labs': ['Laboratórios Libertos', 'A alquimia do Tártaro sem regras.'],
  'Unshackled portals': ['Portais Libertos', 'O Érebo de portas escancaradas.'],
  'Unshackled mooncandy': ['Doce Lunar Liberto', 'Açúcar colhido de Selene.'],
  'Unshackled time machines': ['Teares Libertos', 'O Tear de Cronos sem fio de prumo.'],
  'Unshackled astrofudge': ['Astrocaramelo Liberto', 'Caramelo de estrela cadente.'],
  'Unshackled antimatter condensers': ['Condensadores Libertos', 'O Vazio sem contenção.'],
  'Unshackled alabascream': ['Alabascreme Liberto', 'Creme branco como mármore de túmulo.'],
  'Glittering edge': ['Fio Cintilante', 'A borda do Manto corta a escuridão.'],
  'Unshackled prisms': ['Prismas Libertos', 'A luz das Moiras sem filtro.'],
  'Unshackled iridyum': ['Irídio Liberto', 'O metal do arco-íris de Íris.'],
  'Unshackled chancemakers': ['Forjas do Destino Libertas', 'O acaso forjado sem molde.'],
  'Unshackled glucosmium': ['Glicósmio Liberto', 'Açúcar das estrelas mais densas.'],
  'Unshackled fractal engines': ['Motores Fractais Libertos', 'Engrenagens dentro de engrenagens, soltas.'],
  'Unshackled javascript consoles': ['Consoles do Oráculo Libertos', 'O Oráculo fala sem censura.'],
  'Unshackled glimmeringue': ['Merengue Cintilante Liberto', 'Espuma de luz que não desmancha.'],
  'Unshackled idleverses': ['Idleversos Libertos', 'Universos ociosos sem fronteira.'],
  'Unshackled cortex bakers': ['Padeiros do Córtex Libertos', 'Mentes que assam sem parar.'],
  'Unshackled You': ['Imperador Liberto', 'Você mesmo, sem correntes.'],
});

const pct = (factor, base = 1) => {
  const p = Math.round((Number(factor) - base) * 1000) / 10;
  return `${p > 0 ? '+' : ''}${String(p).replace('.', ',')}%`;
};

/** Frase do efeito (pt-BR) a partir do objeto `effects` — fonte da verdade do texto. */
export function talentEffectText(effects = {}) {
  const fx = effects || {};
  const parts = [];
  const gen = (id) => GENERATOR_BY_ID[id]?.name || id;
  if (fx.allGeneratorsMult != null) parts.push(`Todos os geradores ${pct(fx.allGeneratorsMult)}.`);
  if (fx.clickTalentMult != null) parts.push(`Ceifar ${pct(fx.clickTalentMult)}.`);
  if (fx.shimmerLuckMult != null) parts.push(`Ecos do Acheron aparecem ${pct(fx.shimmerLuckMult)} mais.`);
  if (fx.prestigeEffectMult != null) parts.push(`Potência dos Óbolos ${pct(fx.prestigeEffectMult)}.`);
  if (fx.generatorCostMult != null) parts.push(`Geradores ${pct(1, Number(fx.generatorCostMult)).replace('+', '')} mais baratos.`);
  if (fx.upgradeCostMult != null) parts.push(`Juramentos ${pct(1, Number(fx.upgradeCostMult)).replace('+', '')} mais baratos.`);
  if (fx.offlineRate != null) parts.push(`Offline rende ${pct(Number(fx.offlineRate) + 1)} do SPS.`);
  if (fx.offlineExtraHours != null) parts.push(`Janela offline +${fx.offlineExtraHours} h.`);
  if (fx.startingGeneratorId) parts.push(`Cada corrida começa com ${fx.startingGeneratorQty} × ${gen(fx.startingGeneratorId)}.`);
  if (fx.unshackleGeneratorId) parts.push(`${gen(fx.unshackleGeneratorId)} produz ×25.`);
  if (fx.unshackleFingers) parts.push('Mil Foices rendem ×25.');
  if (fx.kittenVeilFactor != null) parts.push(`Conta como mais um Filhote do Cérbero (${pct(Number(fx.kittenVeilFactor) + 1)} do Véu).`);
  if (fx.catLadies) parts.push('×1,29 de SPS por Filhote do Cérbero possuído.');
  if (fx.kittenUpgradeDiscount) parts.push('Filhotes do Cérbero 10% mais baratos.');
  if (fx.milkhelpServants) parts.push('+5% de SPS por 100% de Véu.');
  if (fx.leechSpawnMult != null) parts.push(`Sanguessugas surgem ${fx.leechSpawnMult}× mais.`);
  if (fx.leechCapBonus != null) parts.push(`+${fx.leechCapBonus} vagas de Sanguessuga.`);
  if (fx.leechPayoutMult != null) parts.push(`Sanguessugas devolvem ${pct(fx.leechPayoutMult)}.`);
  if (fx.leechDigestVisible) parts.push('Mostra quanto cada Sanguessuga digeriu.');
  if (fx.researchDurationMult != null) parts.push(`Pesquisas do Arquivo Estígio ${Math.round(1 / Number(fx.researchDurationMult))}× mais rápidas.`);
  if (fx.nectarReserveBonus) parts.push('Néctar em Reserva: +1% de SPS por Néctar guardado (até 100).');
  if (fx.nectarFrenzyUnlock) parts.push('Libera o Frenesi de Néctar (×3 SPS por 1 h, uma vez por corrida).');
  if (fx.dragonUnlock) parts.push('Desperta o Dragão Ctoniano.');
  if (fx.seasonSwitcherUnlock) parts.push('Libera a troca de estações.');
  if (fx.richAmort) parts.push('A loja detalha em quanto tempo cada compra se paga.');
  if (fx.permanentSlot != null) parts.push(`${fx.permanentSlot} juramento(s) sobrevivem ao Lethe.`);
  if (fx.synergyVolUnlock != null) parts.push(`Libera as Sinergias Vol. ${fx.synergyVolUnlock === 2 ? 'II' : 'I'}.`);
  return parts.join(' ');
}
