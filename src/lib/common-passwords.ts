// The most frequent passwords in public breach compilations (international
// and French). Matching is done on the lowercase, de-leeted form.
export const COMMON_PASSWORDS = new Set<string>(
  `123456 123456789 12345678 12345 1234567 1234567890 123123 111111 000000 654321 666666 121212 112233
  123321 987654321 1234 12345a 123qwe 1q2w3e 1q2w3e4r 1q2w3e4r5t qwerty qwerty123 qwertyuiop azerty
  azerty123 azertyuiop aaaaaa abc123 abcdef abcd1234 password password1 password123 passw0rd motdepasse
  motdepasse1 mdp123 admin admin123 administrator root toor letmein welcome welcome1 iloveyou iloveyou1
  monkey dragon master shadow sunshine princess football baseball soccer superman batman starwars
  trustno1 freedom whatever michael jordan jennifer hunter killer charlie lovely flower hello hello123
  login guest test test123 changeme secret secret123 default access pass pass123 passpass zxcvbnm
  asdfgh asdfghjkl qazwsx 1qaz2wsx q1w2e3r4 zaq12wsx 147258369 159753 789456 789456123 7777777
  888888 999999 555555 222222 333333 444444 102030 101010 123654 159357 147258 456789 11111111
  soleil soleil1 bonjour bonjour1 doudou loulou chouchou nicolas thomas julien camille marseille
  marseille13 paris75 parissg psg lyon olympique allezlom jetaime jetaime1 amour amour1 chocolat
  vacances famille liberte france france1 coucou coucou1 salut salut123 princesse cheval chouette
  doudou1 papa maman mamanpapa bebe bisous loveyou 0000 1111 2222 4321 nathalie isabelle sandrine
  stephanie christophe sebastien frederic philippe alexandre antoine maxime pierre jeanne marie
  sophie laura manon chloe lucas hugo louis leo jules emma jade louise alice lina rose`
    .split(/\s+/)
    .filter(Boolean),
)
