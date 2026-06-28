import { AccountBoardPage } from './components/account-board/account-board-page';
import { SiteGate } from './components/site-gate';

export default function App() {
  return (
    <SiteGate>
      <AccountBoardPage />
    </SiteGate>
  );
}
