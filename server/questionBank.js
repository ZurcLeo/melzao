// Banco dinâmico de questões para substituir MVP_QUESTIONS
// 100 questões: 10 por nível, 3 categorias balanceadas

const QUESTION_BANK = {
  // Nível 1 - Básico (5 honey)
  level1: [
    {
      id: 'lgbtq_1_1', level: 1, category: 'lgbtq',
      question: 'Qual foi a primeira Parada do Orgulho LGBT no Brasil?',
      options: ['São Paulo 1997', 'Rio de Janeiro 1995', 'São Paulo 1995', 'Brasília 1999'],
      correctAnswer: 'São Paulo 1997', honeyValue: 5
    },
    {
      id: 'brasil_1_1', level: 1, category: 'brasil',
      question: 'Qual é o maior estado do Brasil?',
      options: ['Minas Gerais', 'Bahia', 'Amazonas', 'Mato Grosso'],
      correctAnswer: 'Amazonas', honeyValue: 5
    },
    {
      id: 'atual_1_1', level: 1, category: 'atual',
      question: 'Em que ano o TikTok foi lançado globalmente?',
      options: ['2016', '2017', '2018', '2019'],
      correctAnswer: '2018', honeyValue: 5
    },
    {
      id: 'lgbtq_1_2', level: 1, category: 'lgbtq',
      question: 'Quantas cores tem a bandeira LGBT tradicional?',
      options: ['5', '6', '7', '8'],
      correctAnswer: '6', honeyValue: 5
    },
    {
      id: 'brasil_1_2', level: 1, category: 'brasil',
      question: 'Qual é a capital do Brasil?',
      options: ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador'],
      correctAnswer: 'Brasília', honeyValue: 5
    },
    {
      id: 'atual_1_2', level: 1, category: 'atual',
      question: 'Qual rede social Elon Musk comprou em 2022?',
      options: ['Facebook', 'Instagram', 'Twitter', 'LinkedIn'],
      correctAnswer: 'Twitter', honeyValue: 5
    },
    {
      id: 'lgbtq_1_3', level: 1, category: 'lgbtq',
      question: 'O que significa a sigla LGBT?',
      options: ['Lésbicas, Gays, Bissexuais, Trans', 'Liberdade, Gays, Bissexuais, Trans', 'Lésbicas, Gênero, Bissexuais, Trans', 'Lésbicas, Gays, Binários, Trans'],
      correctAnswer: 'Lésbicas, Gays, Bissexuais, Trans', honeyValue: 5
    },
    {
      id: 'brasil_1_3', level: 1, category: 'brasil',
      question: 'Qual é o prato típico brasileiro mais conhecido mundialmente?',
      options: ['Feijoada', 'Brigadeiro', 'Coxinha', 'Açaí'],
      correctAnswer: 'Feijoada', honeyValue: 5
    },
    {
      id: 'atual_1_3', level: 1, category: 'atual',
      question: 'Qual foi o filme mais assistido em 2023?',
      options: ['Avatar 2', 'Top Gun Maverick', 'Barbie', 'Oppenheimer'],
      correctAnswer: 'Barbie', honeyValue: 5
    },
    {
      id: 'lgbtq_1_4', level: 1, category: 'lgbtq',
      question: 'Em que mês é comemorado o Orgulho LGBT no Brasil?',
      options: ['Maio', 'Junho', 'Julho', 'Setembro'],
      correctAnswer: 'Junho', honeyValue: 5
    }
  ],

  // Nível 2 - Fácil (10 honey)
  level2: [
    {
      id: 'lgbtq_2_1', level: 2, category: 'lgbtq',
      question: 'Quem foi a primeira travesti eleita vereadora no Brasil?',
      options: ['Luma de Oliveira', 'Indianara Siqueira', 'Erika Hilton', 'Duda Salabert'],
      correctAnswer: 'Erika Hilton', honeyValue: 10
    },
    {
      id: 'brasil_2_1', level: 2, category: 'brasil',
      question: 'Qual foi o primeiro presidente eleito do Brasil?',
      options: ['Getúlio Vargas', 'Deodoro da Fonseca', 'Prudente de Morais', 'Campos Sales'],
      correctAnswer: 'Deodoro da Fonseca', honeyValue: 10
    },
    {
      id: 'atual_2_1', level: 2, category: 'atual',
      question: 'Qual país sediou a Copa do Mundo de 2022?',
      options: ['Rússia', 'Catar', 'Brasil', 'Alemanha'],
      correctAnswer: 'Catar', honeyValue: 10
    },
    {
      id: 'lgbtq_2_2', level: 2, category: 'lgbtq',
      question: 'Qual artista drag brasileira é mais seguida no Instagram?',
      options: ['Pabllo Vittar', 'Gloria Groove', 'Urias', 'Linn da Quebrada'],
      correctAnswer: 'Pabllo Vittar', honeyValue: 10
    },
    {
      id: 'brasil_2_2', level: 2, category: 'brasil',
      question: 'Qual é o rio mais extenso do Brasil?',
      options: ['Rio São Francisco', 'Rio Paraná', 'Rio Amazonas', 'Rio Tocantins'],
      correctAnswer: 'Rio Amazonas', honeyValue: 10
    },
    {
      id: 'atual_2_2', level: 2, category: 'atual',
      question: 'Qual plataforma de streaming lançou "Stranger Things"?',
      options: ['Netflix', 'Amazon Prime', 'Disney+', 'HBO Max'],
      correctAnswer: 'Netflix', honeyValue: 10
    },
    {
      id: 'lgbtq_2_3', level: 2, category: 'lgbtq',
      question: 'Qual cor da bandeira LGBT representa a natureza?',
      options: ['Verde', 'Azul', 'Amarelo', 'Roxo'],
      correctAnswer: 'Verde', honeyValue: 10
    },
    {
      id: 'brasil_2_3', level: 2, category: 'brasil',
      question: 'Qual é o carnaval mais famoso do Brasil?',
      options: ['Salvador', 'Recife', 'Rio de Janeiro', 'São Paulo'],
      correctAnswer: 'Rio de Janeiro', honeyValue: 10
    },
    {
      id: 'atual_2_3', level: 2, category: 'atual',
      question: 'Qual empresa criou o ChatGPT?',
      options: ['Google', 'Microsoft', 'OpenAI', 'Meta'],
      correctAnswer: 'OpenAI', honeyValue: 10
    },
    {
      id: 'lgbtq_2_4', level: 2, category: 'lgbtq',
      question: 'Qual é o termo para pessoas que não se identificam com nenhum gênero?',
      options: ['Não-binário', 'Agênero', 'Genderfluid', 'Demissexual'],
      correctAnswer: 'Agênero', honeyValue: 10
    }
  ],

  // Nível 3 - Médio-Fácil (20 honey)
  level3: [
    {
      id: 'lgbtq_3_1', level: 3, category: 'lgbtq',
      question: 'Em que ano foi aprovado o casamento igualitário no Brasil?',
      options: ['2011', '2013', '2015', '2019'],
      correctAnswer: '2013', honeyValue: 20
    },
    {
      id: 'brasil_3_1', level: 3, category: 'brasil',
      question: 'Qual escritor brasileiro ganhou o Prêmio Nobel de Literatura?',
      options: ['Machado de Assis', 'Jorge Amado', 'Clarice Lispector', 'Nenhum ainda'],
      correctAnswer: 'Nenhum ainda', honeyValue: 20
    },
    {
      id: 'atual_3_1', level: 3, category: 'atual',
      question: 'Qual criptomoeda teve o maior crescimento em 2021?',
      options: ['Bitcoin', 'Ethereum', 'Dogecoin', 'Cardano'],
      correctAnswer: 'Dogecoin', honeyValue: 20
    },
    {
      id: 'lgbtq_3_2', level: 3, category: 'lgbtq',
      question: 'Qual foi a primeira novela brasileira com beijo gay?',
      options: ['Torre de Babel', 'América', 'Mulheres Apaixonadas', 'A Próxima Vítima'],
      correctAnswer: 'Torre de Babel', honeyValue: 20
    },
    {
      id: 'brasil_3_2', level: 3, category: 'brasil',
      question: 'Em que ano foi abolida a escravidão no Brasil?',
      options: ['1885', '1888', '1889', '1890'],
      correctAnswer: '1888', honeyValue: 20
    },
    {
      id: 'atual_3_2', level: 3, category: 'atual',
      question: 'Qual é o nome da inteligência artificial do Google?',
      options: ['Alexa', 'Siri', 'Bard', 'Cortana'],
      correctAnswer: 'Bard', honeyValue: 20
    },
    {
      id: 'lgbtq_3_3', level: 3, category: 'lgbtq',
      question: 'Qual país foi o primeiro a legalizar a adoção por casais do mesmo sexo?',
      options: ['Holanda', 'Suécia', 'Canadá', 'Noruega'],
      correctAnswer: 'Holanda', honeyValue: 20
    },
    {
      id: 'brasil_3_3', level: 3, category: 'brasil',
      question: 'Qual é a montanha mais alta do Brasil?',
      options: ['Pico da Neblina', 'Pico da Bandeira', 'Pedra da Mina', 'Monte Roraima'],
      correctAnswer: 'Pico da Neblina', honeyValue: 20
    },
    {
      id: 'atual_3_3', level: 3, category: 'atual',
      question: 'Qual rede social foi banida no Brasil em 2024?',
      options: ['TikTok', 'X (Twitter)', 'Instagram', 'Facebook'],
      correctAnswer: 'X (Twitter)', honeyValue: 20
    },
    {
      id: 'lgbtq_3_4', level: 3, category: 'lgbtq',
      question: 'Qual é o significado da letra "Q" em LGBTQ+?',
      options: ['Questionando', 'Queer', 'Qualidade', 'Quieto'],
      correctAnswer: 'Queer', honeyValue: 20
    }
  ],

  // Nível 4 - Médio (40 honey)
  level4: [
    {
      id: 'lgbtq_4_1', level: 4, category: 'lgbtq',
      question: 'Qual drag queen brasileira ganhou o RuPaul\'s Drag Race?',
      options: ['Pabllo Vittar', 'Gloria Groove', 'Sasha Velour', 'Nenhuma ainda'],
      correctAnswer: 'Nenhuma ainda', honeyValue: 40
    },
    {
      id: 'brasil_4_1', level: 4, category: 'brasil',
      question: 'Qual foi o último presidente militar do Brasil?',
      options: ['Ernesto Geisel', 'João Figueiredo', 'Emílio Garrastazu Médici', 'Artur da Costa e Silva'],
      correctAnswer: 'João Figueiredo', honeyValue: 40
    },
    {
      id: 'atual_4_1', level: 4, category: 'atual',
      question: 'Qual empresa comprou o WhatsApp?',
      options: ['Google', 'Apple', 'Meta (Facebook)', 'Microsoft'],
      correctAnswer: 'Meta (Facebook)', honeyValue: 40
    },
    {
      id: 'lgbtq_4_2', level: 4, category: 'lgbtq',
      question: 'Em que cidade aconteceu a Rebelião de Stonewall?',
      options: ['Los Angeles', 'Nova York', 'San Francisco', 'Chicago'],
      correctAnswer: 'Nova York', honeyValue: 40
    },
    {
      id: 'brasil_4_2', level: 4, category: 'brasil',
      question: 'Qual é o segundo maior estado do Brasil?',
      options: ['Pará', 'Minas Gerais', 'Bahia', 'Mato Grosso'],
      correctAnswer: 'Pará', honeyValue: 40
    },
    {
      id: 'atual_4_2', level: 4, category: 'atual',
      question: 'Qual foi o primeiro filme a arrecadar mais de 1 bilhão de dólares?',
      options: ['Titanic', 'Avatar', 'Avengers', 'Star Wars'],
      correctAnswer: 'Titanic', honeyValue: 40
    },
    {
      id: 'lgbtq_4_3', level: 4, category: 'lgbtq',
      question: 'Qual é o nome do movimento pelos direitos LGBT no Brasil dos anos 80?',
      options: ['Movimento Homossexual Brasileiro', 'Grupo Gay da Bahia', 'Lambda', 'Triângulo Rosa'],
      correctAnswer: 'Movimento Homossexual Brasileiro', honeyValue: 40
    },
    {
      id: 'brasil_4_3', level: 4, category: 'brasil',
      question: 'Qual foi o primeiro jornal do Brasil?',
      options: ['Correio Braziliense', 'Gazeta do Rio de Janeiro', 'Diário de Pernambuco', 'O Estado de S. Paulo'],
      correctAnswer: 'Correio Braziliense', honeyValue: 40
    },
    {
      id: 'atual_4_3', level: 4, category: 'atual',
      question: 'Qual é a criptomoeda criada por Elon Musk como meme?',
      options: ['Bitcoin', 'Ethereum', 'Dogecoin', 'Shiba Inu'],
      correctAnswer: 'Dogecoin', honeyValue: 40
    },
    {
      id: 'lgbtq_4_4', level: 4, category: 'lgbtq',
      question: 'Qual presidente brasileiro sancionou a lei de criminalização da homofobia?',
      options: ['Lula', 'Dilma', 'Temer', 'STF decidiu'],
      correctAnswer: 'STF decidiu', honeyValue: 40
    }
  ],

  // Nível 5 - Médio-Difícil (80 honey)
  level5: [
    {
      id: 'lgbtq_5_1', level: 5, category: 'lgbtq',
      question: 'Que cor representa pessoas não-binárias na bandeira do orgulho?',
      options: ['Amarelo', 'Roxo', 'Verde', 'Laranja'],
      correctAnswer: 'Amarelo', honeyValue: 80
    },
    {
      id: 'brasil_5_1', level: 5, category: 'brasil',
      question: 'Qual foi a primeira capital do Brasil?',
      options: ['Salvador', 'Rio de Janeiro', 'São Vicente', 'Olinda'],
      correctAnswer: 'Salvador', honeyValue: 80
    },
    {
      id: 'atual_5_1', level: 5, category: 'atual',
      question: 'Qual é o nome da nave espacial que levou turistas ao espaço em 2021?',
      options: ['Dragon', 'New Shepard', 'Virgin Galactic', 'Todas as anteriores'],
      correctAnswer: 'Todas as anteriores', honeyValue: 80
    },
    {
      id: 'lgbtq_5_2', level: 5, category: 'lgbtq',
      question: 'Qual foi a primeira série brasileira com protagonista trans na TV aberta?',
      options: ['A Força do Querer', 'Liberdade Liberdade', 'Amor de Mãe', 'Travessia'],
      correctAnswer: 'A Força do Querer', honeyValue: 80
    },
    {
      id: 'brasil_5_2', level: 5, category: 'brasil',
      question: 'Qual é o nome do hino nacional brasileiro antes da Independência?',
      options: ['Hino da Independência', 'Hino Nacional Brasileiro', 'Não existia', 'Hino Real'],
      correctAnswer: 'Não existia', honeyValue: 80
    },
    {
      id: 'atual_5_2', level: 5, category: 'atual',
      question: 'Qual tecnologia está por trás do ChatGPT?',
      options: ['Machine Learning', 'Deep Learning', 'Transformer', 'Neural Networks'],
      correctAnswer: 'Transformer', honeyValue: 80
    },
    {
      id: 'lgbtq_5_3', level: 5, category: 'lgbtq',
      question: 'Em que ano foi fundado o primeiro grupo LGBT do Brasil?',
      options: ['1978', '1980', '1975', '1982'],
      correctAnswer: '1978', honeyValue: 80
    },
    {
      id: 'brasil_5_3', level: 5, category: 'brasil',
      question: 'Qual é a origem da palavra "Brasil"?',
      options: ['Pau-brasil', 'Terra Brasilis', 'Brasa', 'Brasil (ilha mítica)'],
      correctAnswer: 'Pau-brasil', honeyValue: 80
    },
    {
      id: 'atual_5_3', level: 5, category: 'atual',
      question: 'Qual país foi o primeiro a regulamentar o uso de inteligência artificial?',
      options: ['Estados Unidos', 'China', 'Reino Unido', 'União Europeia'],
      correctAnswer: 'União Europeia', honeyValue: 80
    },
    {
      id: 'lgbtq_5_4', level: 5, category: 'lgbtq',
      question: 'Qual é o nome do primeiro jornal LGBT do Brasil?',
      options: ['Lampião da Esquina', 'O Snob', 'ChanacomChana', 'Nós Por Exemplo'],
      correctAnswer: 'Lampião da Esquina', honeyValue: 80
    }
  ],

  // Nível 6 - Difícil (160 honey)
  level6: [
    {
      id: 'lgbtq_6_1', level: 6, category: 'lgbtq',
      question: 'Qual cidade brasileira tem o maior número de casais homoafetivos?',
      options: ['São Paulo', 'Rio de Janeiro', 'Fortaleza', 'Porto Alegre'],
      correctAnswer: 'São Paulo', honeyValue: 160
    },
    {
      id: 'brasil_6_1', level: 6, category: 'brasil',
      question: 'Qual foi a duração da ditadura militar brasileira?',
      options: ['20 anos', '21 anos', '19 anos', '22 anos'],
      correctAnswer: '21 anos', honeyValue: 160
    },
    {
      id: 'atual_6_1', level: 6, category: 'atual',
      question: 'Qual é o nome do modelo de IA da Anthropic?',
      options: ['GPT', 'LaMDA', 'Claude', 'Bard'],
      correctAnswer: 'Claude', honeyValue: 160
    },
    {
      id: 'lgbtq_6_2', level: 6, category: 'lgbtq',
      question: 'Qual ativista brasileira foi a primeira travesti a obter PhD?',
      options: ['Indianara Siqueira', 'Luma Andrade', 'Megg Rayara', 'Duda Salabert'],
      correctAnswer: 'Megg Rayara', honeyValue: 160
    },
    {
      id: 'brasil_6_2', level: 6, category: 'brasil',
      question: 'Qual é o nome da primeira mulher presidente do Brasil?',
      options: ['Dilma Rousseff', 'Marina Silva', 'Marta Suplicy', 'Benedita da Silva'],
      correctAnswer: 'Dilma Rousseff', honeyValue: 160
    },
    {
      id: 'atual_6_2', level: 6, category: 'atual',
      question: 'Qual empresa criou o primeiro carro elétrico de massa?',
      options: ['Tesla', 'BMW', 'General Motors', 'Nissan'],
      correctAnswer: 'General Motors', honeyValue: 160
    },
    {
      id: 'lgbtq_6_3', level: 6, category: 'lgbtq',
      question: 'Qual é o nome da organização internacional pelos direitos LGBT?',
      options: ['ILGA', 'GLAAD', 'HRC', 'OutRight'],
      correctAnswer: 'ILGA', honeyValue: 160
    },
    {
      id: 'brasil_6_3', level: 6, category: 'brasil',
      question: 'Em que ano foi criada a Constituição atual do Brasil?',
      options: ['1985', '1988', '1989', '1990'],
      correctAnswer: '1988', honeyValue: 160
    },
    {
      id: 'atual_6_3', level: 6, category: 'atual',
      question: 'Qual foi a primeira vacina contra COVID-19 aprovada no mundo?',
      options: ['Pfizer', 'Moderna', 'AstraZeneca', 'Sputnik V'],
      correctAnswer: 'Pfizer', honeyValue: 160
    },
    {
      id: 'lgbtq_6_4', level: 6, category: 'lgbtq',
      question: 'Qual país tem a maior Parada do Orgulho do mundo?',
      options: ['Brasil', 'Estados Unidos', 'Alemanha', 'Reino Unido'],
      correctAnswer: 'Brasil', honeyValue: 160
    }
  ],

  // Nível 7 - Muito Difícil (320 honey)
  level7: [
    {
      id: 'lgbtq_7_1', level: 7, category: 'lgbtq',
      question: 'Em que década surgiu o termo "bear" ou "urso" na comunidade gay?',
      options: ['1970', '1980', '1990', '2000'],
      correctAnswer: '1980', honeyValue: 320
    },
    {
      id: 'brasil_7_1', level: 7, category: 'brasil',
      question: 'Qual foi o nome da operação que derrubou João Goulart?',
      options: ['Operação Brother Sam', 'Operação Condor', 'Operação Lava Jato', 'Operação Bandeirante'],
      correctAnswer: 'Operação Brother Sam', honeyValue: 320
    },
    {
      id: 'atual_7_1', level: 7, category: 'atual',
      question: 'Qual é o nome do algoritmo usado pelo TikTok?',
      options: ['For You Algorithm', 'Recommendation Engine', 'ByteDance AI', 'Não é público'],
      correctAnswer: 'Não é público', honeyValue: 320
    },
    {
      id: 'lgbtq_7_2', level: 7, category: 'lgbtq',
      question: 'Qual foi o primeiro filme brasileiro com temática LGBT?',
      options: ['O Menino e o Vento', 'Vera', 'A Hora da Estrela', 'Dona Flor e Seus Dois Maridos'],
      correctAnswer: 'O Menino e o Vento', honeyValue: 320
    },
    {
      id: 'brasil_7_2', level: 7, category: 'brasil',
      question: 'Qual é o nome da primeira universidade do Brasil?',
      options: ['USP', 'UFRJ', 'UFBA', 'Universidade do Rio de Janeiro'],
      correctAnswer: 'Universidade do Rio de Janeiro', honeyValue: 320
    },
    {
      id: 'atual_7_2', level: 7, category: 'atual',
      question: 'Qual é o nome do primeiro robô humanoide da Boston Dynamics?',
      options: ['Atlas', 'Spot', 'BigDog', 'Petman'],
      correctAnswer: 'Petman', honeyValue: 320
    },
    {
      id: 'lgbtq_7_3', level: 7, category: 'lgbtq',
      question: 'Qual foi a primeira escola brasileira a adotar nome social para estudantes trans?',
      options: ['Colégio Pedro II', 'UFSC', 'USP', 'UFRGS'],
      correctAnswer: 'UFRGS', honeyValue: 320
    },
    {
      id: 'brasil_7_3', level: 7, category: 'brasil',
      question: 'Em que ano foi assinada a Lei Áurea?',
      options: ['13 de maio de 1888', '15 de novembro de 1889', '7 de setembro de 1822', '12 de outubro de 1888'],
      correctAnswer: '13 de maio de 1888', honeyValue: 320
    },
    {
      id: 'atual_7_3', level: 7, category: 'atual',
      question: 'Qual foi o primeiro NFT vendido por mais de 69 milhões de dólares?',
      options: ['Everydays: The First 5000 Days', 'CryptoPunks', 'Bored Ape', 'The Pixel'],
      correctAnswer: 'Everydays: The First 5000 Days', honeyValue: 320
    },
    {
      id: 'lgbtq_7_4', level: 7, category: 'lgbtq',
      question: 'Qual é o nome da primeira deputada federal trans eleita no Brasil?',
      options: ['Erika Hilton', 'Duda Salabert', 'Indianara Siqueira', 'Robeyoncé Lima'],
      correctAnswer: 'Erika Hilton', honeyValue: 320
    }
  ],

  // Nível 8 - Extremo (640 honey)
  level8: [
    {
      id: 'lgbtq_8_1', level: 8, category: 'lgbtq',
      question: 'Qual o primeiro país a legalizar o casamento igualitário?',
      options: ['Holanda', 'Bélgica', 'Canadá', 'Espanha'],
      correctAnswer: 'Holanda', honeyValue: 640
    },
    {
      id: 'brasil_8_1', level: 8, category: 'brasil',
      question: 'Qual foi o nome do plano econômico que criou o Real?',
      options: ['Plano Collor', 'Plano Verão', 'Plano Real', 'Plano Cruzado'],
      correctAnswer: 'Plano Real', honeyValue: 640
    },
    {
      id: 'atual_8_1', level: 8, category: 'atual',
      question: 'Qual é o nome do primeiro computador quântico da Google?',
      options: ['Sycamore', 'Quantum', 'Bristlecone', 'Foxtail'],
      correctAnswer: 'Sycamore', honeyValue: 640
    },
    {
      id: 'lgbtq_8_2', level: 8, category: 'lgbtq',
      question: 'Em que ano foi realizada a primeira cirurgia de redesignação sexual?',
      options: ['1930', '1952', '1966', '1972'],
      correctAnswer: '1952', honeyValue: 640
    },
    {
      id: 'brasil_8_2', level: 8, category: 'brasil',
      question: 'Qual foi o primeiro partido político do Brasil?',
      options: ['Partido Conservador', 'Partido Liberal', 'Partido Republicano', 'Não existia'],
      correctAnswer: 'Partido Conservador', honeyValue: 640
    },
    {
      id: 'atual_8_2', level: 8, category: 'atual',
      question: 'Qual é o nome da primeira mulher CEO da General Motors?',
      options: ['Mary Barra', 'Susan Wojcicki', 'Ginni Rometty', 'Safra Catz'],
      correctAnswer: 'Mary Barra', honeyValue: 640
    },
    {
      id: 'lgbtq_8_3', level: 8, category: 'lgbtq',
      question: 'Qual foi a primeira pessoa intersexo a competir nas Olimpíadas?',
      options: ['Caster Semenya', 'Dutee Chand', 'Annet Negesa', 'Não se sabe'],
      correctAnswer: 'Não se sabe', honeyValue: 640
    },
    {
      id: 'brasil_8_3', level: 8, category: 'brasil',
      question: 'Qual foi o nome da primeira estrada de ferro do Brasil?',
      options: ['Central do Brasil', 'Estrada de Ferro Dom Pedro II', 'Estrada de Ferro Mauá', 'São Paulo Railway'],
      correctAnswer: 'Estrada de Ferro Mauá', honeyValue: 640
    },
    {
      id: 'atual_8_3', level: 8, category: 'atual',
      question: 'Qual foi o primeiro país a banir TikTok completamente?',
      options: ['Índia', 'China', 'Estados Unidos', 'Afeganistão'],
      correctAnswer: 'Afeganistão', honeyValue: 640
    },
    {
      id: 'lgbtq_8_4', level: 8, category: 'lgbtq',
      question: 'Qual é o nome do médico alemão que criou o termo "homossexualidade"?',
      options: ['Magnus Hirschfeld', 'Karl Heinrich Ulrichs', 'Károly Mária Kertbeny', 'Richard von Krafft-Ebing'],
      correctAnswer: 'Károly Mária Kertbeny', honeyValue: 640
    }
  ],

  // Nível 9 - Lendário (1280 honey)
  level9: [
    {
      id: 'lgbtq_9_1', level: 9, category: 'lgbtq',
      question: 'Quantas cores tem a bandeira original do orgulho LGBT criada por Gilbert Baker?',
      options: ['6', '7', '8', '9'],
      correctAnswer: '8', honeyValue: 1280
    },
    {
      id: 'brasil_9_1', level: 9, category: 'brasil',
      question: 'Qual foi o nome do primeiro computador brasileiro?',
      options: ['Patinho Feio', 'G-10', 'Cobra', 'Zezinho'],
      correctAnswer: 'Patinho Feio', honeyValue: 1280
    },
    {
      id: 'atual_9_1', level: 9, category: 'atual',
      question: 'Qual é o nome da primeira foto de um buraco negro?',
      options: ['Event Horizon', 'M87*', 'Sagittarius A*', 'Black Hole One'],
      correctAnswer: 'M87*', honeyValue: 1280
    },
    {
      id: 'lgbtq_9_2', level: 9, category: 'lgbtq',
      question: 'Qual foi o nome da primeira organização LGBT da história?',
      options: ['Scientific-Humanitarian Committee', 'Mattachine Society', 'One Magazine', 'Society for Human Rights'],
      correctAnswer: 'Scientific-Humanitarian Committee', honeyValue: 1280
    },
    {
      id: 'brasil_9_2', level: 9, category: 'brasil',
      question: 'Qual foi o primeiro satélite brasileiro lançado ao espaço?',
      options: ['Brasilsat A1', 'SCD-1', 'Amazonia-1', 'CBERS-1'],
      correctAnswer: 'SCD-1', honeyValue: 1280
    },
    {
      id: 'atual_9_2', level: 9, category: 'atual',
      question: 'Qual é o nome do algoritmo usado pelo Bitcoin?',
      options: ['SHA-256', 'Scrypt', 'X11', 'Ethash'],
      correctAnswer: 'SHA-256', honeyValue: 1280
    },
    {
      id: 'lgbtq_9_3', level: 9, category: 'lgbtq',
      question: 'Em que ano foi criado o símbolo do triângulo rosa?',
      options: ['1935', '1940', '1945', '1950'],
      correctAnswer: '1935', honeyValue: 1280
    },
    {
      id: 'brasil_9_3', level: 9, category: 'brasil',
      question: 'Qual foi o nome do primeiro código penal brasileiro?',
      options: ['Código Criminal do Império', 'Código Penal Republicano', 'Ordenações Filipinas', 'Código de Processo Criminal'],
      correctAnswer: 'Código Criminal do Império', honeyValue: 1280
    },
    {
      id: 'atual_9_3', level: 9, category: 'atual',
      question: 'Qual foi o primeiro videogame a usar inteligência artificial?',
      options: ['Pac-Man', 'Space Invaders', 'Pong', 'Computer Space'],
      correctAnswer: 'Pac-Man', honeyValue: 1280
    },
    {
      id: 'lgbtq_9_4', level: 9, category: 'lgbtq',
      question: 'Qual é o nome da primeira pessoa trans a ser nomeada ministra no mundo?',
      options: ['Georgina Beyer', 'Amanda Simpson', 'Rachel Levine', 'Não se sabe'],
      correctAnswer: 'Não se sabe', honeyValue: 1280
    }
  ],

  // Nível 10 - Mítico (2560 honey)
  level10: [
    {
      id: 'lgbtq_10_1', level: 10, category: 'lgbtq',
      question: 'Qual o significado da sigla LGBTQIAPN+?',
      options: [
        'Lésbicas, Gays, Bissexuais, Trans, Queer, Intersexo, Assexuais, Pansexuais, Não-binários e outras identidades',
        'Lésbicas, Gays, Bissexuais, Trans, Questionando, Intersexo, Aliados, Pansexuais, Neutros e outras identidades',
        'Lésbicas, Gays, Bissexuais, Transgêneros, Queer, Intersexo, Assexuais, Polissexuais, Neutros e outras identidades',
        'Lésbicas, Gays, Bissexuais, Trans, Queer, Intersexo, Andróginos, Pansexuais, Neutros e outras identidades'
      ],
      correctAnswer: 'Lésbicas, Gays, Bissexuais, Trans, Queer, Intersexo, Assexuais, Pansexuais, Não-binários e outras identidades',
      honeyValue: 2560
    },
    {
      id: 'brasil_10_1', level: 10, category: 'brasil',
      question: 'Qual foi o nome do primeiro mapa do Brasil?',
      options: ['Mapa de Pero Vaz de Caminha', 'Carta de Pero Vaz', 'Terra Brasilis', 'Mapa de Cantino'],
      correctAnswer: 'Mapa de Cantino', honeyValue: 2560
    },
    {
      id: 'atual_10_1', level: 10, category: 'atual',
      question: 'Qual é o nome do primeiro robô humanoide a ganhar cidadania?',
      options: ['Sophia', 'Atlas', 'ASIMO', 'Pepper'],
      correctAnswer: 'Sophia', honeyValue: 2560
    },
    {
      id: 'lgbtq_10_2', level: 10, category: 'lgbtq',
      question: 'Qual foi a primeira cirurgia de mudança de sexo registrada na história?',
      options: ['Lili Elbe (1930)', 'Christine Jorgensen (1952)', 'Roberta Cowell (1951)', 'Não se sabe'],
      correctAnswer: 'Lili Elbe (1930)', honeyValue: 2560
    },
    {
      id: 'brasil_10_2', level: 10, category: 'brasil',
      question: 'Qual foi o primeiro imposto criado no Brasil?',
      options: ['Quinto Real', 'Dízimo', 'Derrama', 'Capitação'],
      correctAnswer: 'Quinto Real', honeyValue: 2560
    },
    {
      id: 'atual_10_2', level: 10, category: 'atual',
      question: 'Qual é o nome do primeiro programa de TV gerado completamente por IA?',
      options: ['Nothing, Forever', 'AI Talk Show', 'Digital Humans', 'Synthetic Media'],
      correctAnswer: 'Nothing, Forever', honeyValue: 2560
    },
    {
      id: 'lgbtq_10_3', level: 10, category: 'lgbtq',
      question: 'Qual foi o primeiro país a reconhecer oficialmente um terceiro gênero?',
      options: ['Tailândia', 'Nepal', 'Malta', 'Alemanha'],
      correctAnswer: 'Nepal', honeyValue: 2560
    },
    {
      id: 'brasil_10_3', level: 10, category: 'brasil',
      question: 'Qual foi a primeira fábrica instalada no Brasil?',
      options: ['Fábrica de Ferro de Ipanema', 'Real Fábrica de Ferro', 'Companhia Siderúrgica Nacional', 'Usina de Volta Redonda'],
      correctAnswer: 'Real Fábrica de Ferro', honeyValue: 2560
    },
    {
      id: 'atual_10_3', level: 10, category: 'atual',
      question: 'Qual foi o primeiro país a criar uma moeda digital nacional?',
      options: ['China', 'Bahamas', 'Suécia', 'Uruguai'],
      correctAnswer: 'Bahamas', honeyValue: 2560
    },
    {
      id: 'lgbtq_10_4', level: 10, category: 'lgbtq',
      question: 'Qual é o nome da primeira pessoa LGBT canonizada pela Igreja Católica?',
      options: ['São Sebastião', 'Santo Antônio', 'São João', 'Nenhuma'],
      correctAnswer: 'Nenhuma', honeyValue: 2560
    }
  ]
};

class QuestionBank {
  static getRandomQuestion(level) {
    const levelKey = `level${level}`;
    const questions = QUESTION_BANK[levelKey];

    if (!questions || questions.length === 0) {
      throw new Error(`Nenhuma questão encontrada para o nível ${level}`);
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  static getRandomQuestionsByCategory(level, category) {
    const levelKey = `level${level}`;
    const questions = QUESTION_BANK[levelKey];

    if (!questions) {
      throw new Error(`Nível ${level} não encontrado`);
    }

    const categoryQuestions = questions.filter(q => q.category === category);

    if (categoryQuestions.length === 0) {
      throw new Error(`Nenhuma questão da categoria ${category} encontrada no nível ${level}`);
    }

    const randomIndex = Math.floor(Math.random() * categoryQuestions.length);
    return categoryQuestions[randomIndex];
  }

  static getAllQuestions() {
    const allQuestions = [];
    Object.values(QUESTION_BANK).forEach(levelQuestions => {
      allQuestions.push(...levelQuestions);
    });
    return allQuestions;
  }

  static getQuestionsByLevel(level) {
    const levelKey = `level${level}`;
    return QUESTION_BANK[levelKey] || [];
  }

  static getQuestionStats() {
    const stats = {
      total: 0,
      byLevel: {},
      byCategory: { lgbtq: 0, brasil: 0, atual: 0 }
    };

    Object.entries(QUESTION_BANK).forEach(([levelKey, questions]) => {
      const level = parseInt(levelKey.replace('level', ''));
      stats.byLevel[level] = questions.length;
      stats.total += questions.length;

      questions.forEach(q => {
        if (stats.byCategory[q.category] !== undefined) {
          stats.byCategory[q.category]++;
        }
      });
    });

    return stats;
  }

  // Sistema anti-repetição para evitar mesmas questões em sessões seguidas
  static getRandomQuestionWithHistory(level, usedQuestionIds = []) {
    const levelKey = `level${level}`;
    const questions = QUESTION_BANK[levelKey];

    if (!questions) {
      throw new Error(`Nível ${level} não encontrado`);
    }

    // Filtrar questões não utilizadas
    const unusedQuestions = questions.filter(q => !usedQuestionIds.includes(q.id));

    // Se todas foram usadas, resetar (permitir reutilização)
    const availableQuestions = unusedQuestions.length > 0 ? unusedQuestions : questions;

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
  }
}

module.exports = { QuestionBank, QUESTION_BANK };